import { useEffect } from 'react';
import './App.css';
import launchGame from './phaser/game';
import { useGameStore } from './stores/gameStore';
import AsciiArt from './components/AsciiArt';
import * as art from './data/asciiArt';

function App() {
  const player = useGameStore((state) => state.player);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const log = useGameStore((state) => state.log);
  const currentEnemy = useGameStore((state) => state.currentEnemy);
  const actions = useGameStore((state) => state.actions);

  useEffect(() => {
    // We want the phaser canvas to be there, but not necessarily visible
    const game = launchGame('phaser-game');
    return () => {
      game.destroy(true);
    }
  }, []); // Run only once

  const getCurrentArt = () => {
    if (gamePhase === 'combat') {
      if (currentEnemy?.name === 'Goblin') return art.goblin;
      if (currentEnemy?.name === 'Troll') return art.troll;
    }
    switch (gamePhase) {
      case 'start':
        return art.inn;
      case 'dungeon-intro':
      case 'dungeon':
        return art.dungeon;
      case 'trap':
        return art.trap;
      case 'win':
        return art.win;
      case 'lose':
        return art.lose;
      default:
        return art.dungeon;
    }
  };

  const renderLog = () => (
    <div id="log-area">
      {log.map((message, index) => (
        <p key={index}>{message}</p>
      ))}
    </div>
  );

  return (
    <div id="game-container">
      <div id="phaser-game" style={{ display: gamePhase !== 'start' ? 'block' : 'none' }}></div>
      <div id="ui-container">
        <div id="ui-header">
          <div id="player-stats">
            <p>Player HP: {player.hp} / {player.maxHp}</p>
          </div>
        </div>

        <div id="main-content">
          <AsciiArt art={getCurrentArt()} />
        </div>

        <div id="ui-footer">
          <div id="text-area">
            {gamePhase === 'start' && <p>You wake up with a splitting headache in a dimly lit room... A dream, a nightmare of a shrieking beast, still fresh in your mind.</p>}
            {log.length > 0 && renderLog()}
            {currentEnemy && (
              <div id="enemy-stats">
                <p>{currentEnemy.name}</p>
                <p>HP: {currentEnemy.hp} / {currentEnemy.maxHp}</p>
              </div>
            )}
          </div>
          <div id="actions-area">
            {gamePhase === 'start' && <button onClick={actions.leaveInn}>Leave the inn</button>}
            {gamePhase === 'dungeon-intro' && <button onClick={actions.prepareToMove}>Dust yourself off</button>}
            {gamePhase === 'dungeon' && <button onClick={actions.moveForward}>Move Forward</button>}
            {gamePhase === 'trap' && <button onClick={() => actions.setGamePhase('dungeon')}>Continue</button>}
            {gamePhase === 'combat' && <button onClick={actions.attack}>Attack {currentEnemy?.name}</button>}
            {(gamePhase === 'win' || gamePhase === 'lose') && <button onClick={actions.resetGame}>Try Again</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
