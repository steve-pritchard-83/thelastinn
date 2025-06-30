export type AttackRoll = (diceRoll: number) => { hit: boolean; crit: boolean };

export interface Character {
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  attackRoll: AttackRoll;
}

export interface Player extends Character {
  // Player-specific properties can go here
}

export interface Enemy extends Character {
  // Enemy-specific properties can go here
} 