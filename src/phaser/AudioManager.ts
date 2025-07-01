import * as Phaser from 'phaser';

class AudioManager {
    private static instance: AudioManager;
    private scene: Phaser.Scene | null = null;
    private currentMusic: Phaser.Sound.BaseSound | null = null;
    private sceneSound: Phaser.Sound.BaseSoundManager | null = null;
    private isMuted: boolean = false;

    // private constructor to enforce singleton pattern
    private constructor() { }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public setScene(scene: Phaser.Scene): void {
        this.scene = scene;
    }

    public init(soundManager: Phaser.Sound.BaseSoundManager) {
        this.sceneSound = soundManager;
    }

    public setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (this.sceneSound) {
            this.sceneSound.mute = muted;
        }
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    public toggleMute(): boolean {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    public playSfx(key: string) {
        if (!this.sceneSound || this.isMuted) return;
        this.sceneSound.play(key);
    }

    public playMusic(key: string, loop: boolean = true): void {
        if (!this.sceneSound) return;
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.currentMusic.stop();
        }
        this.currentMusic = this.sceneSound.add(key, { loop });
        if (!this.isMuted) {
            this.currentMusic.play();
        }
    }

    public playNarrationThenMusic(narrationKey: string, musicKey: string, loop: boolean = true): void {
        if (this.scene && !this.isMuted) {
            const narrationSound = this.scene.sound.add(narrationKey);
            narrationSound.on('complete', () => {
                this.playMusic(musicKey, loop);
            });
            narrationSound.play();
        } else if (!this.isMuted) {
            console.warn('AudioManager: Scene not set. Cannot play narration.');
        }
    }

    public stopAllMusic(): void {
        if (this.scene && this.currentMusic) {
            this.currentMusic.stop();
        }
    }
}

export default AudioManager; 