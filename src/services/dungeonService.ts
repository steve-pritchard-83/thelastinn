import { goblin, troll } from '../data/characters';
import type { Enemy } from '../types/characters';

export type Encounter =
  | { type: 'empty' | 'potion' | 'trap' | 'empty-hallway'; text: string; damage?: number }
  | { type: 'combat'; enemy: Enemy; text: string; isFinalBoss?: boolean };

export const generateEncounter = (goblinsKilled: number, trollAggroed: boolean): Encounter => {
  if (goblinsKilled >= 5 && !trollAggroed) {
      // Guaranteed Troll encounter after 5 goblins
      return {
          type: 'combat',
          enemy: { ...troll },
          text: 'A thunderous growl shakes the stone. A towering Troll looms ahead!',
          isFinalBoss: true,
      }
  }

  // Random encounter logic
  const isHallway = Math.random() > 0.5;

  if (isHallway) {
      const hasTrap = Math.random() < 0.6; // 60% chance of a trap in a hallway
      if (hasTrap) {
          const trap = { damage: 1 }; // Trap deals 1 damage
          return {
              type: 'trap',
              text: `A sharp click underfoot — a dart pierces your arm! You take ${trap.damage} damage.`,
              damage: trap.damage
          };
      } else {
           return { type: 'empty-hallway', text: 'The hall is silent, but the walls seem to breathe.' };
      }
  } else { // It's a room
      const hasEnemy = Math.random() < 0.7; // 70% chance of an enemy in a room
      if (hasEnemy) {
          return {
              type: 'combat',
              enemy: { ...goblin },
              text: 'A Goblin screeches from the shadows and lunges!',
          };
      } else {
          const hasPotion = Math.random() < 0.4; // 40% chance for a potion in a an empty room
          if (hasPotion) {
               return { type: 'potion', text: 'A cracked vial glimmers faintly. A healing potion. You pocket it.' };
          }
           return { type: 'empty', text: 'The room lies still. You move on, senses sharp.' };
      }
  }
}; 