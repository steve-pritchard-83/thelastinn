import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'phaser-game',
  scene: [GameScene],
};

const launchGame = (containerId: string) => {
    const game = new Phaser.Game({ ...config, parent: containerId });
    return game;
};

export default launchGame;
export { GameScene }; 