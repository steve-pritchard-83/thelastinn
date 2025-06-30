import type { Player, Enemy, AttackRoll } from '../types/characters';

const warriorAttackRoll: AttackRoll = (diceRoll) => {
  if (diceRoll <= 3) return { hit: false, crit: false }; // miss
  if (diceRoll <= 5) return { hit: true, crit: false };  // hit
  return { hit: true, crit: true }; // crit
};

const standardAttackRoll: AttackRoll = (diceRoll) => {
  if (diceRoll <= 3) return { hit: false, crit: false }; // miss
  return { hit: true, crit: false };  // hit
};

export const warrior: Player = {
  name: 'Warrior',
  hp: 10,
  maxHp: 10,
  damage: 1,
  attackRoll: warriorAttackRoll,
};

export const goblin: Enemy = {
  name: 'Goblin',
  hp: 2,
  maxHp: 2,
  damage: 1,
  attackRoll: standardAttackRoll,
};

export const troll: Enemy = {
  name: 'Troll',
  hp: 5,
  maxHp: 5,
  damage: 2,
  attackRoll: standardAttackRoll,
};

export const spikeTrap: Enemy = {
    name: 'Spike Trap',
    hp: 1,
    maxHp: 1,
    damage: 1,
    attackRoll: standardAttackRoll
} 