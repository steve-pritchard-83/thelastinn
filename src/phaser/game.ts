import Phaser from 'phaser';
import { useGameStore, type GameState } from '../stores/gameStore';
import AudioManager from './AudioManager';

// A mapping from game state to image asset key
const sceneImageKeys = {
  'start': 'dungeonintro',
  'dungeon-intro': 'dungeonintro',
  'trapdoor': 'trapdoor',
  'dungeon': 'dungeon',
  'empty-room': 'emptyroom',
  'trap': 'trap',
  'win': 'win',
  'lose': 'loss',
  'combat': 'dungeon',
  'prepareToMove': 'dungeonintro',
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
    this.load.image('emptyroom', 'assets/images/emptyroom.png');
    
    // Preload audio
    this.load.audio('musicIntroLoop', 'assets/audio/music/introloop.mp3');
    this.load.audio('musicCombatLoop', 'assets/audio/music/combatloop.mp3');
    this.load.audio('musicDeathLoop', 'assets/audio/music/deathloop.mp3');
    this.load.audio('victorymusic', 'assets/audio/music/victorymusic.mp3');
    this.load.audio('sfxDoor', 'assets/audio/sfx/door.mp3');
    this.load.audio('forest.mp3', 'assets/audio/sfx/forest.mp3');
    this.load.audio('sfxHit', 'assets/audio/sfx/hit.mp3');
    this.load.audio('sfxMiss', 'assets/audio/sfx/miss.mp3');
    this.load.audio('sfxTrap', 'assets/audio/sfx/trap.mp3');
    this.load.audio('sfxPotion', 'assets/audio/sfx/potion.mp3');
    this.load.audio('sfxUpgrade', 'assets/audio/sfx/upgrade.mp3');
    this.load.audio('goblinshriek', 'assets/audio/sfx/goblinshriek.mp3');
    this.load.audio('goblindeath', 'assets/audio/sfx/goblindeath.mp3');
    this.load.audio('trollroar', 'assets/audio/sfx/trollroar.mp3');
    this.load.audio('trolldeath', 'assets/audio/sfx/trolldeath.mp3');
    this.load.audio('footsteps', 'assets/audio/sfx/footsteps.mp3');
  }

  create() {
    this.audioManager = AudioManager.getInstance();
    this.audioManager.init(this.game.sound);
    
    // Initialize mute state from game store
    const gameState = useGameStore.getState();
    this.audioManager.setMuted(gameState.isMuted);
    
    this.lights.enable().setAmbientColor(0x686868);

    this.light = this.lights.addLight(this.cameras.main.centerX, this.cameras.main.centerY, 600).setColor(0xffc87d).setIntensity(2.5);

    this.tweens.add({
        targets: this.light,
        intensity: { from: 2.2, to: 2.8 },
        duration: 500,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
    });
    
    this.audioManager.playMusic('musicIntroLoop');
    
    useGameStore.subscribe(
      (state, prevState) => this.handleStateChange(state, prevState)
    );
    
    // Set initial scene without transition
    this.updateScene(useGameStore.getState());

    this.scale.on('resize', this.onResize, this);
  }

  onResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.light.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
    if (this.currentSceneImage) this.scaleImageToFit(this.currentSceneImage);
    if (this.currentEnemyImage) this.scaleImageToFit(this.currentEnemyImage);
  }
  
  handleStateChange(state: GameState, prevState: GameState) {
    // Start transition if we just started transitioning and have a pending state change
    if (state.isTransitioning && !prevState.isTransitioning && state.pendingStateChange) {
      this.transitionToScene(state);
      return;
    }

    // Handle non-visual changes like screen shake
    if (state.gamePhase === 'trap' && prevState.gamePhase !== 'trap') {
        this.cameras.main.shake(500, 0.02);
    }

    if (state.attackTurn > prevState.attackTurn) {
      if (state.lastAttackResult === 'hit') this.cameras.main.shake(100, 0.015);
      else if (state.lastAttackResult === 'miss') this.cameras.main.shake(100, 0.005);
    }
  }

  transitionToScene(_state: GameState) {
    console.log('Starting transition...');
    this.audioManager.playSfx('footsteps');
    
    // Don't use Phaser camera fades, rely on CSS transitions
    // Just update the scene after the CSS fade-out would complete
    this.time.delayedCall(1500, () => {
      console.log('Applying state change...');
      // Apply the pending state change and update the scene
      useGameStore.getState().actions.applyPendingStateChange();
      this.updateScene(useGameStore.getState());
      
      // End transition after CSS fade-in would complete
      this.time.delayedCall(1500, () => {
        console.log('Ending transition...');
        useGameStore.getState().actions.endTransition();
      });
    });
  }

  updateScene(state: GameState) {
    // This function now just swaps the images, to be called during the transition
    const sceneKey = sceneImageKeys[state.gamePhase as keyof typeof sceneImageKeys];
    if (sceneKey) {
        if(this.currentSceneImage) this.currentSceneImage.destroy();
        this.currentSceneImage = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, sceneKey);
        this.currentSceneImage.setPipeline('Light2D');
        this.scaleImageToFit(this.currentSceneImage);
    }
    
    if (state.currentEnemy) {
        const enemyKey = enemyImageKeys[state.currentEnemy.name as keyof typeof enemyImageKeys];
        if (enemyKey) {
            if (this.currentEnemyImage) this.currentEnemyImage.destroy();
            this.currentEnemyImage = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, enemyKey);
            this.currentEnemyImage.setPipeline('Light2D');
            this.scaleImageToFit(this.currentEnemyImage);
            this.currentEnemyImage.setVisible(true);
            if (this.currentSceneImage) this.currentSceneImage.setVisible(false);
        }
    } else {
        if (this.currentEnemyImage) this.currentEnemyImage.setVisible(false);
        if (this.currentSceneImage) this.currentSceneImage.setVisible(true);
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