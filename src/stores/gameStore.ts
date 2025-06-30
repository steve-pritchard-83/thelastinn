import { create } from 'zustand';
import type { Player, Enemy } from '../types/characters';
import { warrior, goblin, troll, spikeTrap } from '../data/characters';

type GamePhase = 'start' | 'dungeon-intro' | 'dungeon' | 'combat' | 'trap' | 'win' | 'lose';

// Function to roll a 6-sided die
const rollDice = () => Math.floor(Math.random() * 6) + 1;

interface GameState {
  player: Player;
  goblinsKilled: number;
  trollAggroed: boolean;
  gamePhase: GamePhase;
  log: string[];
  currentEnemy: Enemy | null;
  actions: {
    leaveInn: () => void;
    prepareToMove: () => void;
    moveForward: () => void;
    attack: () => void;
    setGamePhase: (phase: GamePhase) => void;
    resetGame: () => void;
  };
}

const initialState = {
  player: { ...warrior },
  goblinsKilled: 0,
  trollAggroed: false,
  gamePhase: 'start' as GamePhase,
  log: [],
  currentEnemy: null,
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...initialState,
  actions: {
    leaveInn: () => {
        set({
            gamePhase: 'dungeon-intro',
            log: ["You stumble out of the inn and into the woods. The path home is familiar, yet unsettling... Suddenly, the ground gives way beneath your feet! You land in a heap in a dark, dusty place."]
        })
    },
    prepareToMove: () => {
        set({
            gamePhase: 'dungeon',
            log: ["You dust yourself off and look ahead. The only way is forward."],
        })
    },
    moveForward: () => {
      const isHallway = Math.random() < 0.5;
      let newLog: string[] = [];
      let nextPhase: GamePhase = 'dungeon';

      if (isHallway) {
        const hasTrap = Math.random() < 0.5;
        if (hasTrap) {
          const trap = { ...spikeTrap };
          const player = get().player;
          const damage = trap.damage;
          const newPlayerHp = player.hp - damage;
          newLog = [`You walk down a hallway and spring a spike trap! You take ${damage} damage.`];
          
          if (newPlayerHp <= 0) {
            newLog.push('You have succumbed to your injuries.');
            nextPhase = 'lose';
          } else {
            nextPhase = 'trap';
          }

          set({ player: { ...player, hp: newPlayerHp }, log: newLog, gamePhase: nextPhase });
          return;
        } else {
          newLog = ['The hallway is empty. You continue cautiously.'];
        }
      } else { // It's a room
        const hasGoblin = Math.random() < 0.5;
        if (hasGoblin) {
          const newEnemy = { ...goblin };
          newLog = ['You enter a room and find a Goblin!'];
          nextPhase = 'combat';
          set({ currentEnemy: newEnemy, log: newLog, gamePhase: nextPhase });
          return;
        } else {
          newLog = ['The room is quiet and empty. You press on.'];
        }
      }
      set({ log: newLog, gamePhase: nextPhase });
    },
    attack: () => {
        const { player, currentEnemy } = get();
        if (!currentEnemy) return;

        let newLog: string[] = [];

        // Player attacks
        const playerDice = rollDice();
        const playerAttack = player.attackRoll(playerDice);
        let newEnemyHp = currentEnemy.hp;

        if(playerAttack.hit) {
            const damage = playerAttack.crit ? player.damage * 2 : player.damage;
            newEnemyHp -= damage;
            newLog.push(`You attack the ${currentEnemy.name} and ${playerAttack.crit ? 'CRITICALLY HIT' : 'hit'} for ${damage} damage!`);
        } else {
            newLog.push(`You attack the ${currentEnemy.name} and miss!`);
        }

        if (newEnemyHp <= 0) {
            newLog.push(`You have defeated the ${currentEnemy.name}!`);
            const newKills = get().goblinsKilled + 1;
            set({ currentEnemy: null, gamePhase: 'dungeon', log: newLog, goblinsKilled: newKills });
            if (newKills >= 5 && !get().trollAggroed) {
                const newLogWithTroll = [...newLog, "A deep growl echoes from the shadows. The Troll is coming!"];
                const trollEnemy = {...troll};
                set({ trollAggroed: true, currentEnemy: trollEnemy, gamePhase: 'combat', log: newLogWithTroll });
            }
            if (currentEnemy.name === 'Troll') {
              newLog.push('The troll collapses, and a ray of sunlight pierces through a crack in the ceiling. You are free!');
              set({ gamePhase: 'win' });
            }
            return;
        }

        // Enemy attacks
        const enemyDice = rollDice();
        const enemyAttack = currentEnemy.attackRoll(enemyDice);
        let newPlayerHp = player.hp;

        if (enemyAttack.hit) {
            const damage = enemyAttack.crit ? currentEnemy.damage * 2 : currentEnemy.damage; // Assuming enemies can't crit based on description
            newPlayerHp -= damage;
            newLog.push(`The ${currentEnemy.name} attacks you and hits for ${damage} damage!`);
        } else {
            newLog.push(`The ${currentEnemy.name} attacks you and misses!`);
        }

        if (newPlayerHp <= 0) {
            newLog.push('You have been defeated! The beast\'s shriek fills your mind as you fall unconscious.');
            set({ player: {...player, hp: 0}, gamePhase: 'lose', log: newLog, currentEnemy: null });
            return;
        }

        set({
            player: { ...player, hp: newPlayerHp },
            currentEnemy: { ...currentEnemy, hp: newEnemyHp },
            log: newLog
        });
    },
    setGamePhase: (phase: GamePhase) => set({ gamePhase: phase }),
    resetGame: () => set(initialState),
  },
}));
