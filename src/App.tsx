import { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import launchGame from './phaser/game';
import { useGameStore } from './stores/gameStore';
import Typewriter from './components/Typewriter';
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
  const lingeringEchoes = useGameStore((state) => state.lingeringEchoes);
  const healthPotions = useGameStore((state) => state.healthPotions);
  const permanentUpgrades = useGameStore((state) => state.permanentUpgrades);
  const actions = useGameStore((state) => state.actions);
  const [typingIndex, setTypingIndex] = useState(0);
  const timingMeterRef = useRef<TimingMeterRef>(null);

  const hpUpgradeCost = 10;

  useEffect(() => {
    // When the log from the store changes, reset the typing index to start from the beginning.
    setTypingIndex(0);
  }, [gameLog]);

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

  const handleTypingComplete = useCallback(() => {
    setTypingIndex(prev => prev + 1);
  }, []);

  const handleAttack = () => {
    const isSuccess = timingMeterRef.current?.isSuccess() ?? false;
    actions.attack(isSuccess);
  };

  const fullyTypedLog = gameLog.slice(0, typingIndex);
  const lineBeingTyped = gameLog.length > typingIndex ? gameLog[typingIndex] : null;

  if (!isGameStarted) {
    return <StartScreen onStart={handleGameStart} />;
  }

  return (
    <div id="game-container">
      <div id="ui-container">
        <div id="ui-header">
          <HealthBar label="Player HP" currentHp={player.hp} maxHp={player.maxHp} />
          <p>Potions: {healthPotions}</p>
        </div>

        <div id="main-content">
          <div id="phaser-game"></div>
        </div>

        <div id="ui-footer">
          <div id="text-area">
            {gamePhase === 'start' ? (
              <div className="inn-shop">
                <h3>The Last Inn</h3>
                <p>A single, flickering candle illuminates the quiet common room. Outside, the monstrous forest groans, but in here, you are safe. For now.</p>
                <p>The innkeeper speaks of "Lingering Echoes," remnants of those lost to the woods, which can reinforce your own reality.</p>
                <hr />
                <h4>The Innkeeper's Ledger</h4>
                <p>Your lingering echoes: {lingeringEchoes}</p>
                <p>Current bonus HP: {permanentUpgrades.bonusHp}</p>
                <button
                  onClick={() => actions.purchaseHpUpgrade(hpUpgradeCost)}
                  disabled={lingeringEchoes < hpUpgradeCost}
                  title={lingeringEchoes < hpUpgradeCost ? "Not enough echoes" : `Cost: ${hpUpgradeCost} echoes`}
                >
                  Reinforce Vitality (+1 Max HP)
                </button>
              </div>
            ) : (
              <>
                <div id="log-area">
                  {fullyTypedLog.map((message, index) => (
                    <p key={index} className="typewriter-text">{message}</p>
                  ))}
                  {lineBeingTyped && (
                    <Typewriter
                      text={lineBeingTyped}
                      onTypingComplete={handleTypingComplete}
                    />
                  )}
                </div>
              </>
            )}

            {currentEnemy && (
              <div id="enemy-stats">
                <HealthBar label={currentEnemy.name} currentHp={currentEnemy.hp} maxHp={currentEnemy.maxHp} />
              </div>
            )}
          </div>
          {gamePhase === 'combat' && <TimingMeter ref={timingMeterRef} speed={1} />}
          <div id="actions-area">
            {gamePhase === 'start' && <button onClick={actions.leaveInn}>Leave the inn</button>}
            {gamePhase === 'dungeon-intro' && <button onClick={actions.prepareToMove}>Continue through the woods</button>}
            {gamePhase === 'trapdoor' && <button onClick={actions.fallThroughTrapdoor}>Investigate the cellar door</button>}
            {gamePhase === 'dungeon' && <button onClick={actions.moveForward}>Move Forward</button>}
            {gamePhase === 'trap' && <button onClick={() => actions.setGamePhase('dungeon')}>Continue</button>}
            {gamePhase === 'combat' && <button onClick={handleAttack}>Attack</button>}
            {gamePhase === 'goblin-killed' && <button onClick={actions.continueAfterCombat}>Step over the corpse</button>}

            {(gamePhase === 'dungeon' || gamePhase === 'combat' || gamePhase === 'trap') && (
              <button
                onClick={actions.useHealthPotion}
                disabled={healthPotions <= 0 || player.hp === player.maxHp}
                title={healthPotions <= 0 ? "No potions left" : player.hp === player.maxHp ? "Health is full" : "Use a health potion"}
              >
                Use Potion
              </button>
            )}

            {(gamePhase === 'win' || gamePhase === 'lose') && <button onClick={actions.resetGame}>Return to the Inn</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
