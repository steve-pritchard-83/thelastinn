import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import launchGame from './phaser/game';
import { useGameStore } from './stores/gameStore';
import HealthBar from './components/HealthBar';
import StartScreen from './components/StartScreen';
import TimingMeter from './components/TimingMeter';
import type { TimingMeterRef } from './components/TimingMeter';

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const player = useGameStore((state) => state.player);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const gameLog = useGameStore((state) => state.log);
  const currentEnemy = useGameStore((state) => state.currentEnemy);
  const healthPotions = useGameStore((state) => state.healthPotions);
  const actions = useGameStore((state) => state.actions);
  const isTransitioning = useGameStore((state) => state.isTransitioning);
  const isMuted = useGameStore((state) => state.isMuted);
  const timingMeterRef = useRef<TimingMeterRef>(null);

  useEffect(() => {
    if (!isGameStarted) return;
    const game = launchGame('phaser-game');
    return () => {
      game.destroy(true);
    };
  }, [isGameStarted]);

  const handleGameStart = () => {
    // This user interaction unlocks the AudioContext.
    // The actual audio playback will be triggered inside the Phaser scene.
    setIsGameStarted(true);
  };

  const handleAttack = () => {
    const isSuccess = timingMeterRef.current?.isSuccess() ?? false;
    actions.attack(isSuccess);
  };

  if (!isGameStarted) {
    return <StartScreen onStart={handleGameStart} />;
  }

  return (
    <div 
      id="game-container" 
      className={isTransitioning ? 'transitioning' : ''}
    >
      <div id="ui-container">
        <div id="ui-header">
          <HealthBar label="Player HP" currentHp={player.hp} maxHp={player.maxHp} />
          <div className="header-row">
            <p className="potion-counter"><span className="icon icon-potion">🧪</span><span>Potions: {healthPotions}</span></p>
            <button className="mute-button" onClick={actions.toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              <span className="icon">{isMuted ? '🔇' : '🔊'}</span>
            </button>
          </div>
        </div>

        <div id="main-content">
          <div id="phaser-game"></div>
        </div>

        <div id="ui-footer">
          <div id="text-area">
            {gamePhase === 'start' ? (
              <div className="inn-shop">
                <h3>The Last Inn</h3>
                <p>Awoken from a drunken nightmare about a shrieking beast, a lone candle flickers at your table in the local Inn. Time to head home to bed....</p>
              </div>
            ) : (
              <>
                <div id="log-area">
                  {gameLog.map((message, index) => (
                    <p key={index} className="typewriter-text">{message}</p>
                  ))}
                </div>
              </>
            )}

            {currentEnemy && (
              <div id="enemy-stats">
                <HealthBar label={currentEnemy.name} currentHp={currentEnemy.hp} maxHp={currentEnemy.maxHp} />
              </div>
            )}
          </div>
          {gamePhase === 'combat' && <TimingMeter ref={timingMeterRef} speed={1.3} />}
          <div id="actions-area">
            {gamePhase === 'start' && <button onClick={actions.leaveInn} disabled={isTransitioning}>Leave the inn</button>}
            {gamePhase === 'trapdoor' && <button onClick={actions.fallThroughTrapdoor} disabled={isTransitioning}>Open the cellar door</button>}
            {(gamePhase === 'dungeon' || gamePhase === 'empty-room') && <button onClick={actions.moveForward} disabled={isTransitioning}><span className="icon icon-move">🧭</span><span>Explore</span></button>}
            {gamePhase === 'trap' && <button onClick={actions.moveForward} disabled={isTransitioning}><span className="icon icon-move">🧭</span><span>Explore</span></button>}
            {gamePhase === 'combat' && <button onClick={handleAttack} disabled={isTransitioning}><span className="icon icon-attack">⚔</span><span>Attack</span></button>}
            {gamePhase === 'goblin-killed' && <button onClick={actions.continueAfterCombat} disabled={isTransitioning}><span className="icon icon-move">🧭</span><span>Explore</span></button>}

            {(gamePhase === 'dungeon' || gamePhase === 'combat' || gamePhase === 'trap' || gamePhase === 'empty-room') && (
              <button
                onClick={actions.useHealthPotion}
                disabled={healthPotions <= 0 || player.hp === player.maxHp || isTransitioning}
                title={healthPotions <= 0 ? "No potions left" : player.hp === player.maxHp ? "Health is full" : "Use a health potion"}
              >
                <span className="icon icon-potion">🧪</span><span>Drink Potion</span>
              </button>
            )}

            {(gamePhase === 'win' || gamePhase === 'lose') && <button onClick={actions.resetGame} disabled={isTransitioning}><span className="icon icon-home">⌂</span><span>Return to the Inn</span></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
