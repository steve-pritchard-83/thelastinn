import { goblin, troll } from '../data/characters';
import type { Enemy } from '../types/characters';

export type Encounter =
  | { type: 'empty' | 'potion' | 'trap'; text: string; damage?: number }
  | { type: 'combat'; enemy: Enemy; text: string; isFinalBoss?: boolean };

export const generateEncounter = (goblinsKilled: number, trollAggroed: boolean): Encounter => {
  if (goblinsKilled >= 2 && !trollAggroed) {
      // Guaranteed Troll encounter after 2 goblins
      return {
          type: 'combat',
          enemy: { ...troll },
          text: 'A deep growl echoes from the shadows. A massive Troll blocks your path!',
          isFinalBoss: true,
      }
  }

  // Random encounter logic
  const isHallway = Math.random() > 0.5;

  if (isHallway) {
      const hasTrap = Math.random() < 0.6; // 60% chance of a trap in a hallway
      if (hasTrap) {
          const trap = { damage: Math.floor(Math.random() * 2) + 2 }; // Trap deals 2-3 damage
          return {
              type: 'trap',
              text: `As you walk, you hear a *click* underfoot. Spikes shoot from the walls! You take ${trap.damage} damage.`,
              damage: trap.damage
          };
      } else {
           return { type: 'empty', text: 'The narrow hallway is eerily quiet. You continue cautiously.' };
      }
  } else { // It's a room
      const hasEnemy = Math.random() < 0.7; // 70% chance of an enemy in a room
      if (hasEnemy) {
          return {
              type: 'combat',
              enemy: { ...goblin },
              text: 'You enter a small, crumbling room. A Goblin shrieks and charges at you!',
          };
      } else {
          const hasPotion = Math.random() < 0.4; // 40% chance for a potion in a an empty room
          if (hasPotion) {
               return { type: 'potion', text: 'You find a discarded health potion on the floor. You stow it for later.' };
          }
           return { type: 'empty', text: 'The room is quiet and empty. You press on.' };
      }
  }
}; 