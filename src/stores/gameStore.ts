import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Enemy } from '../types/characters';
import { warrior } from '../data/characters';
import { type Encounter, generateEncounter } from '../services/dungeonService';
import AudioManager from '../phaser/AudioManager';

type GamePhase = 'start' | 'dungeon-intro' | 'trapdoor' | 'dungeon' | 'combat' | 'trap' | 'win' | 'lose' | 'prepareToMove' | 'goblin-killed';

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
  lingeringEchoes: number;
  healthPotions: number;
  attackTurn: number;
  lastAttackResult: 'hit' | 'miss' | null;
  permanentUpgrades: {
    bonusHp: number;
  };
  actions: {
    leaveInn: () => void;
    prepareToMove: () => void;
    fallThroughTrapdoor: () => void;
    moveForward: () => void;
    attack: (timedHit: boolean) => void;
    useHealthPotion: () => void;
    findHealthPotion: () => void;
    purchaseHpUpgrade: (cost: number) => void;
    setGamePhase: (phase: GamePhase) => void;
    resetGame: () => void;
    continueAfterCombat: () => void;
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
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialRunState,
      permanentUpgrades: {
        bonusHp: 0,
      },
      lingeringEchoes: 0,
      actions: {
        leaveInn: () => {
          AudioManager.getInstance().playSfx('sfxDoor');
          const currentUpgrades = get().permanentUpgrades;
          const newPlayer = {
            ...warrior,
            hp: warrior.maxHp + currentUpgrades.bonusHp,
            maxHp: warrior.maxHp + currentUpgrades.bonusHp,
          };
          set({
            gamePhase: 'dungeon-intro',
            log: [
              "The innkeeper gives you a solemn nod as you push open the heavy oak door.",
              "The air is cold. The woods ahead are unnaturally dark and silent."
            ],
            player: newPlayer
          });
        },
        prepareToMove: () => {
          set({ 
            gamePhase: 'trapdoor', 
            log: [
              "You walk for what feels like hours.",
              "The woods grow unnaturally dense. You notice a moss-covered cellar door half-buried in the mud."
            ]
          });
        },
        fallThroughTrapdoor: () => {
          set({ 
            gamePhase: 'dungeon',
            log: [
              "The rusty hinges give way and you tumble into the darkness below.",
              "You land on a pile of bones. This is no cellar. It's a dungeon."
            ]
          });
        },
        moveForward: () => {
          const { goblinsKilled, trollAggroed, player } = get();
          const encounter = generateEncounter(goblinsKilled, trollAggroed);
          const newLog = [encounter.text];

          switch (encounter.type) {
            case 'combat':
              AudioManager.getInstance().playMusic('musicCombatLoop');
              set({ currentEncounter: encounter, currentEnemy: encounter.enemy, log: newLog, gamePhase: 'combat' });
              if (encounter.enemy.name === 'Troll') {
                set({ trollAggroed: true });
              }
              break;
            case 'trap':
              if (navigator.vibrate) navigator.vibrate([100, 30, 100]); // Buzz, pause, buzz
              AudioManager.getInstance().playSfx('sfxTrap');
              const newHp = player.hp - (encounter.damage || 0);
              if (newHp <= 0) {
                newLog.push('You have succumbed to your injuries.');
                AudioManager.getInstance().playMusic('musicDeathLoop');
                set({ player: { ...player, hp: newHp }, log: newLog, gamePhase: 'lose' });
              } else {
                set({ player: { ...player, hp: newHp }, log: newLog, gamePhase: 'trap' });
              }
              break;
            case 'potion':
              get().actions.findHealthPotion();
              set({ log: [encounter.text], gamePhase: 'dungeon' });
              break;
            case 'empty':
              set({ log: newLog, gamePhase: 'dungeon' });
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
            newLog.push(`You attack the ${currentEnemy.name} and ${isCrit ? 'CRITICALLY HIT' : 'hit'} for ${damage} damage!${timedHit ? ' (Perfect!)' : ''}`);
          } else {
            AudioManager.getInstance().playSfx('sfxMiss');
            newLog.push(`You attack the ${currentEnemy.name} and miss!`);
          }

          if (newEnemyHp <= 0) {
            newLog.push(`You have defeated the ${currentEnemy.name}!`);

            if (currentEncounter && currentEncounter.type === 'combat' && currentEncounter.isFinalBoss) {
              newLog.push("With the hulking beast slain, you spot a sunlit hole in the ceiling above.");
              newLog.push("You climb out, escaping the dark dungeon and returning to the inn for a well-deserved celebratory beer!");
              AudioManager.getInstance().stopAllMusic();
              set({ currentEnemy: null, gamePhase: 'win', log: newLog, currentEncounter: null });
              return;
            }

            if (currentEnemy.name === 'Goblin') {
              const newKills = get().goblinsKilled + 1;
              const echoesEarned = 1;
              newLog.push("The creature's foul-smelling blood pools on the floor. You step over the corpse, ready to press on.");
              newLog.push(`You earned ${echoesEarned} lingering echo.`);
              set(state => ({ 
                goblinsKilled: newKills, 
                currentEnemy: null, 
                gamePhase: 'goblin-killed', 
                log: newLog, 
                currentEncounter: null,
                lingeringEchoes: state.lingeringEchoes + echoesEarned
              }));
              return;
            }

            // Fallback for other enemies if any are added
            set({ currentEnemy: null, gamePhase: 'dungeon', log: newLog, currentEncounter: null });
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
            newLog.push(`The ${currentEnemy.name} attacks you and hits for ${damage} damage!`);
          } else {
            AudioManager.getInstance().playSfx('sfxMiss');
            newLog.push(`The ${currentEnemy.name} attacks you and misses!`);
          }

          if (newPlayerHp <= 0) {
            const echoesFromRun = get().goblinsKilled;
            if (navigator.vibrate) navigator.vibrate(500); // Long buzz for death
            newLog.push('You have been defeated! Your vision fades to black as you fall unconscious.');
            newLog.push(`You earned ${echoesFromRun} lingering echoes.`);
            AudioManager.getInstance().playMusic('musicDeathLoop');
            set(state => ({ 
              player: { ...player, hp: 0 }, 
              gamePhase: 'lose', 
              log: newLog, 
              currentEnemy: null,
              lingeringEchoes: state.lingeringEchoes + echoesFromRun,
            }));
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
              log: [...get().log, `You drink a potion and recover ${healAmount} HP. You feel invigorated.`]
            });
          }
        },
        findHealthPotion: () => {
          set(state => ({ healthPotions: state.healthPotions + 1 }));
        },
        purchaseHpUpgrade: (cost: number) => {
          const currentEchoes = get().lingeringEchoes;
          if (currentEchoes >= cost) {
            AudioManager.getInstance().playSfx('sfxUpgrade');
            set((state) => ({
              lingeringEchoes: state.lingeringEchoes - cost,
              permanentUpgrades: {
                ...state.permanentUpgrades,
                bonusHp: state.permanentUpgrades.bonusHp + 1,
              },
            }));
          }
        },
        setGamePhase: (phase: GamePhase) => {
          set({ gamePhase: phase });
        },
        resetGame: () => {
          const echoes = get().lingeringEchoes;
          const upgrades = get().permanentUpgrades;
          const newPlayer = {
            ...warrior,
            hp: warrior.maxHp + upgrades.bonusHp,
            maxHp: warrior.maxHp + upgrades.bonusHp,
          };
        
          set({ 
            ...initialRunState, 
            player: newPlayer,
            lingeringEchoes: echoes,
            permanentUpgrades: upgrades,
            log: ["You find yourself back at the inn, the roaring fire a stark contrast to the chilling dungeon. The echoes of your journey linger."],
            gamePhase: 'start',
          });
        },
        continueAfterCombat: () => {
            set({gamePhase: 'dungeon'})
        }
      },
    }),
    {
      name: 'the-last-inn-storage',
      partialize: (state) => ({ 
        lingeringEchoes: state.lingeringEchoes,
        permanentUpgrades: state.permanentUpgrades,
      }),
    }
  )
);
