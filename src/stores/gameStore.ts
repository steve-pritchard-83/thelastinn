import { create } from 'zustand';
import type { Player, Enemy } from '../types/characters';
import { warrior } from '../data/characters';
import { type Encounter, generateEncounter } from '../services/dungeonService';
import AudioManager from '../phaser/AudioManager';

type GamePhase = 'start' | 'dungeon-intro' | 'trapdoor' | 'dungeon' | 'combat' | 'trap' | 'win' | 'lose' | 'prepareToMove' | 'goblin-killed' | 'empty-room';

// Function to roll a 6-sided die
const rollDice = () => Math.floor(Math.random() * 6) + 1;

export interface GameState {
  player: Player;
  goblinsKilled: number;
  trollAggroed: boolean;
  gamePhase: GamePhase;
  log: string[];
  currentEnemy: Enemy | null;
  currentEncounter: Encounter | null;
  healthPotions: number;
  attackTurn: number;
  lastAttackResult: 'hit' | 'miss' | null;
  isTransitioning: boolean;
  transitionPhase: 'none' | 'fade-out' | 'fade-in';
  pendingStateChange: Partial<GameState> | null;
  isMuted: boolean;
  actions: {
    leaveInn: () => void;
    fallThroughTrapdoor: () => void;
    moveForward: () => void;
    attack: (timedHit: boolean) => void;
    useHealthPotion: () => void;
    findHealthPotion: () => void;
    setGamePhase: (phase: GamePhase) => void;
    resetGame: () => void;
    continueAfterCombat: () => void;
    startTransition: () => void;
    endTransition: () => void;
    applyPendingStateChange: () => void;
    toggleMute: () => void;
  };
}

const initialRunState = {
  player: { ...warrior },
  goblinsKilled: 0,
  trollAggroed: false,
  gamePhase: 'start' as GamePhase,
  log: [],
  currentEnemy: null,
  currentEncounter: null,
  healthPotions: 1,
  attackTurn: 0,
  lastAttackResult: null,
  isTransitioning: false,
  transitionPhase: 'none' as const,
  pendingStateChange: null,
  isMuted: typeof window !== 'undefined' ? localStorage.getItem('thelastinn-muted') === 'true' : false,
};

export const useGameStore = create<GameState>()(
  (set, get) => ({
    ...initialRunState,
    actions: {
      leaveInn: () => {
        AudioManager.getInstance().playSfx('sfxDoor');
        AudioManager.getInstance().playMusic('forest.mp3');
        const newPlayer = { ...warrior };
        
        // Start transition immediately and queue the state change
        set({ 
          isTransitioning: true,
          pendingStateChange: {
            gamePhase: 'trapdoor',
            log: [
              "You walk for what feels like hours through the dark forest.",
              "The trees twist tighter. Half-buried in the muck, a mossy cellar door beckons."
            ],
            player: newPlayer
          }
        });
      },
      fallThroughTrapdoor: () => {
        AudioManager.getInstance().playMusic('musicIntroLoop');
        set({ 
          isTransitioning: true,
          pendingStateChange: {
            gamePhase: 'dungeon',
            log: [
              "The rotted hinges groan as the door gives way beneath you.",
              "You crash into the dark, landing on a mound of bones.",
              "This is no cellar. It's a dungeon."
            ]
          }
        });
      },
      moveForward: () => {
        const { goblinsKilled, trollAggroed, player } = get();
        const encounter = generateEncounter(goblinsKilled, trollAggroed);
        const newLog = [encounter.text];

        switch (encounter.type) {
          case 'combat':
            AudioManager.getInstance().playMusic('musicCombatLoop');
            if (encounter.enemy.name === 'Goblin') {
              AudioManager.getInstance().playSfx('goblinshriek');
            } else if (encounter.enemy.name === 'Troll') {
              AudioManager.getInstance().playSfx('trollroar');
            }
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                currentEncounter: encounter, 
                currentEnemy: encounter.enemy, 
                log: newLog, 
                gamePhase: 'combat',
                trollAggroed: encounter.enemy.name === 'Troll' ? true : get().trollAggroed
              }
            });
            break;
          case 'trap':
            if (navigator.vibrate) navigator.vibrate([100, 30, 100]); // Buzz, pause, buzz
            AudioManager.getInstance().playSfx('sfxTrap');
            const newHp = player.hp - (encounter.damage || 0);
            if (newHp <= 0) {
              newLog.push('Your wounds overwhelm you. You collapse in the black.');
              AudioManager.getInstance().playMusic('musicDeathLoop');
              set({ 
                isTransitioning: true,
                pendingStateChange: {
                  player: { ...player, hp: newHp }, 
                  log: newLog, 
                  gamePhase: 'lose'
                }
              });
            } else {
              AudioManager.getInstance().playMusic('musicIntroLoop');
              set({ 
                isTransitioning: true,
                pendingStateChange: {
                  player: { ...player, hp: newHp }, 
                  log: newLog, 
                  gamePhase: 'trap'
                }
              });
            }
            break;
          case 'potion':
            AudioManager.getInstance().playMusic('musicIntroLoop');
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                log: [encounter.text], 
                gamePhase: 'empty-room',
                healthPotions: get().healthPotions + 1
              }
            });
            break;
          case 'empty':
            AudioManager.getInstance().playMusic('musicIntroLoop');
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                log: [encounter.text], 
                gamePhase: 'empty-room'
              }
            });
            break;
          case 'empty-hallway':
            AudioManager.getInstance().playMusic('musicIntroLoop');
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                log: [encounter.text], 
                gamePhase: 'dungeon'
              }
            });
            break;
        }
      },
      attack: (timedHit) => {
        const { player, currentEnemy, currentEncounter } = get();
        if (!currentEnemy) return;

        let newLog: string[] = [];

        // Player attacks
        const playerDice = rollDice();
        const playerAttack = player.attackRoll(playerDice);
        let newEnemyHp = currentEnemy.hp;
        let playerHit = false;

        if (timedHit || playerAttack.hit) {
          playerHit = true;
          if (navigator.vibrate) navigator.vibrate(100); // Sharp buzz for a hit
          AudioManager.getInstance().playSfx('sfxHit');
          const isCrit = timedHit ? false : playerAttack.crit; // Timed hits aren't critical unless the roll is also a crit
          const damage = isCrit ? player.damage * 2 : player.damage;
          newEnemyHp -= damage;
          newLog.push(`You strike the ${currentEnemy.name} — a clean hit! (${damage} damage)${timedHit ? ' (Perfect!)' : ''}`);
        } else {
          AudioManager.getInstance().playSfx('sfxMiss');
          newLog.push(`You swing at the ${currentEnemy.name} and miss!`);
        }

        if (newEnemyHp <= 0) {
          if (currentEncounter?.type === 'combat' && currentEncounter.isFinalBoss) {
            AudioManager.getInstance().playSfx('trolldeath');
            AudioManager.getInstance().playMusic('victorymusic', false);
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                currentEnemy: null, 
                gamePhase: 'win', 
                log: [
                  `You strike the ${currentEnemy.name} — a clean hit!`,
                  "The Troll's corpse hits the ground with a final, shuddering thud.",
                  "Above, a shaft of sunlight breaks through. You climb toward freedom and ale."
                ], 
                currentEncounter: null 
              }
            });
            return;
          }

          if (currentEnemy.name === 'Goblin') {
            AudioManager.getInstance().playSfx('goblindeath');
            AudioManager.getInstance().playMusic('musicIntroLoop');
            const newKills = get().goblinsKilled + 1;
            newLog.push("The Goblin collapses in a pool of its own foul blood.");
            newLog.push("You step over the corpse and steel yourself for what lies ahead.");
            set({ 
              isTransitioning: true,
              pendingStateChange: {
                goblinsKilled: newKills, 
                currentEnemy: null, 
                gamePhase: 'goblin-killed', 
                log: newLog, 
                currentEncounter: null,
              }
            });
            return;
          }

          // Fallback for other enemies if any are added
          set({ 
            isTransitioning: true,
            pendingStateChange: {
              currentEnemy: null, 
              gamePhase: 'dungeon', 
              log: newLog, 
              currentEncounter: null
            }
          });
          return;
        }

        // Enemy attacks
        const enemyDice = rollDice();
        const enemyAttack = currentEnemy.attackRoll(enemyDice);
        let newPlayerHp = player.hp;

        if (enemyAttack.hit) {
          if (navigator.vibrate) navigator.vibrate(100); // Sharp buzz for a hit
          AudioManager.getInstance().playSfx('sfxHit');
          const damage = enemyAttack.crit ? currentEnemy.damage * 2 : currentEnemy.damage;
          newPlayerHp -= damage;
          newLog.push(`The ${currentEnemy.name} swings wide and hits you for ${damage} damage!`);
        } else {
          AudioManager.getInstance().playSfx('sfxMiss');
          newLog.push(`The ${currentEnemy.name} swings wide and misses you!`);
        }

        if (newPlayerHp <= 0) {
          if (navigator.vibrate) navigator.vibrate(500); // Long buzz for death
          newLog.push('Your strength fails. Darkness claims you.');
          AudioManager.getInstance().playMusic('musicDeathLoop');
          set({ 
            isTransitioning: true,
            pendingStateChange: {
              player: { ...player, hp: 0 }, 
              gamePhase: 'lose', 
              log: newLog, 
              currentEnemy: null,
            }
          });
          return;
        }

        set((state) => ({
          player: { ...player, hp: newPlayerHp },
          currentEnemy: { ...currentEnemy, hp: newEnemyHp },
          log: newLog,
          attackTurn: state.attackTurn + 1,
          lastAttackResult: playerHit ? 'hit' : 'miss',
        }));
      },
      useHealthPotion: () => {
        const { player, healthPotions } = get();
        if (healthPotions > 0 && player.hp < player.maxHp) {
          AudioManager.getInstance().playSfx('sfxPotion');
          const healAmount = Math.floor(player.maxHp / 2); // Heal for 50% of max HP
          const newPlayerHp = Math.min(player.maxHp, player.hp + healAmount);
          set({
            player: { ...player, hp: newPlayerHp },
            healthPotions: healthPotions - 1,
            log: [...get().log, `You drink a potion and recover ${healAmount} HP.`]
          });
        }
      },
      findHealthPotion: () => {
        set(state => ({ healthPotions: state.healthPotions + 1 }));
      },
      setGamePhase: (phase: GamePhase) => {
        set({ gamePhase: phase });
      },
      resetGame: () => {
        AudioManager.getInstance().playMusic('fireplace');
        set({ 
          isTransitioning: true,
          transitionPhase: 'fade-out',
          pendingStateChange: { 
            ...initialRunState,
            transitionPhase: 'none'
          }
        });
      },
      continueAfterCombat: () => {
        get().actions.moveForward();
      },
      startTransition: () => {
        set({ isTransitioning: true });
      },
      endTransition: () => {
        set({ isTransitioning: false });
      },
      applyPendingStateChange: () => {
        const pendingState = get().pendingStateChange;
        if (pendingState) {
          set({ ...pendingState, pendingStateChange: null });
        }
      },
      toggleMute: () => {
        const newMutedState = !get().isMuted;
        set({ isMuted: newMutedState });
        
        // Sync with AudioManager
        AudioManager.getInstance().setMuted(newMutedState);
        
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('thelastinn-muted', newMutedState.toString());
        }
      }
    }
  })
);
