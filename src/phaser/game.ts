import Phaser from 'phaser';
import { useGameStore } from '../stores/gameStore';
import AudioManager from './AudioManager';

// A mapping from game state to image asset key
const sceneImageKeys = {
  'start': 'dungeonintro', // Assuming you have an image for the inn
  'dungeon-intro': 'dungeonintro',
  'trapdoor': 'trapdoor',
  'dungeon': 'dungeon',
  'trap': 'trap',
  'win': 'win',
  'lose': 'loss',
  'combat': 'dungeon', // Background for combat
  'prepareToMove': 'dungeonintro', // Or whatever is appropriate
  'goblin-killed': 'deadgoblin',
};

const enemyImageKeys = {
  'Goblin': 'goblin',
  'Troll': 'troll',
};

class GameScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private currentSceneImage: Phaser.GameObjects.Image | null = null;
  private currentEnemyImage: Phaser.GameObjects.Image | null = null;
  private light!: Phaser.GameObjects.Light;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('dungeonintro', 'assets/images/dungeonintro.png');
    this.load.image('trapdoor', 'assets/images/trapdoor.png');
    this.load.image('dungeon', 'assets/images/dungeon.png');
    this.load.image('trap', 'assets/images/trap.png');
    this.load.image('win', 'assets/images/win.png');
    this.load.image('loss', 'assets/images/loss.png');
    this.load.image('goblin', 'assets/images/goblin.png');
    this.load.image('troll', 'assets/images/troll.png');
    this.load.image('deadgoblin', 'assets/images/deadgoblin.png');
    
    // Preload audio
    this.load.audio('narrationIntro', 'assets/audio/narration/intronarration.mp3');
    this.load.audio('musicIntroLoop', 'assets/audio/music/introloop.mp3');
    this.load.audio('musicCombatLoop', 'assets/audio/music/combatloop.mp3');
    this.load.audio('musicDeathLoop', 'assets/audio/music/deathloop.mp3');
    this.load.audio('sfxDoor', 'assets/audio/sfx/door.mp3');
    this.load.audio('sfxHit', 'assets/audio/sfx/hit.mp3');
    this.load.audio('sfxMiss', 'assets/audio/sfx/miss.mp3');
    this.load.audio('sfxTrap', 'assets/audio/sfx/trap.mp3');
    this.load.audio('sfxPotion', 'assets/audio/sfx/potion.mp3');
    this.load.audio('sfxUpgrade', 'assets/audio/sfx/upgrade.mp3');
  }

  create() {
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this.game.sound);
    this.lights.enable().setAmbientColor(0x1a1a1a);

    this.light = this.lights.addLight(this.cameras.main.centerX, this.cameras.main.centerY, 600).setColor(0xffc87d).setIntensity(2.5);

    this.tweens.add({
        targets: this.light,
        intensity: { from: 2.2, to: 2.8 },
        duration: 500,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
    });
    
    // Set initial music & narration
    this.audioManager.playMusic('musicIntroLoop');
    this.audioManager.playSfx('narrationIntro');
    
    // Subscribe to Zustand state changes
    useGameStore.subscribe(
      (state, prevState) => {
        this.handleStateChange(state, prevState);
      }
    );
    
    // Initial scene setup
    this.handleStateChange(useGameStore.getState(), useGameStore.getState());

    this.scale.on('resize', this.onResize, this);
  }

  onResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.light.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
    if (this.currentSceneImage) this.scaleImageToFit(this.currentSceneImage);
    if (this.currentEnemyImage) this.scaleImageToFit(this.currentEnemyImage);
  }
  
  handleStateChange(state: any, prevState: any) {
    // Update background scene
    const newSceneKey = sceneImageKeys[state.gamePhase as keyof typeof sceneImageKeys];
    if (newSceneKey && (!this.currentSceneImage || this.currentSceneImage.texture.key !== newSceneKey)) {
        if(this.currentSceneImage) this.currentSceneImage.destroy();
        this.currentSceneImage = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, newSceneKey);
        this.currentSceneImage.setPipeline('Light2D');
        this.scaleImageToFit(this.currentSceneImage);
    }
    
    // Update enemy visibility and texture
    if (state.currentEnemy) {
        const enemyKey = enemyImageKeys[state.currentEnemy.name as keyof typeof enemyImageKeys];
        if (enemyKey) {
            if (!this.currentEnemyImage || this.currentEnemyImage.texture.key !== enemyKey) {
                if (this.currentEnemyImage) this.currentEnemyImage.destroy();
                this.currentEnemyImage = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, enemyKey);
                this.currentEnemyImage.setPipeline('Light2D');
                this.scaleImageToFit(this.currentEnemyImage);
            }
            this.currentEnemyImage.setVisible(true);
            // Hide scene image if enemy is present
            if (this.currentSceneImage) this.currentSceneImage.setVisible(false);
        }
    } else {
        if (this.currentEnemyImage) this.currentEnemyImage.setVisible(false);
        // Show scene image if no enemy
        if (this.currentSceneImage) this.currentSceneImage.setVisible(true);
    }

    // Handle screen shake on trap
    if (state.gamePhase === 'trap' && prevState.gamePhase !== 'trap') {
        this.cameras.main.shake(500, 0.02);
    }

    // Handle screen shake on combat hits/misses
    if (state.attackTurn > prevState.attackTurn) {
      if (state.lastAttackResult === 'hit') {
        this.cameras.main.shake(100, 0.015); // A sharp jolt for a hit
      } else if (state.lastAttackResult === 'miss') {
        this.cameras.main.shake(100, 0.005); // A softer vibration for a miss
      }
    }
  }

  scaleImageToFit(image: Phaser.GameObjects.Image) {
    const { width, height } = this.cameras.main;
    const scale = Math.max(width / image.width, height / image.height);
    image.setScale(scale).setPosition(width / 2, height / 2);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: "100%",
  height: "100%",
  scene: GameScene,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const launchGame = (containerId: string) => {
  if (config.parent !== containerId) {
    config.parent = containerId;
  }
  return new Phaser.Game(config);
};

export default launchGame; 