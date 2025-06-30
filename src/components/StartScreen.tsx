import React from 'react';
import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="start-screen-overlay">
      <div className="start-screen-content">
        <h1>The Last Inn</h1>
        <button onClick={onStart}>Click to Start</button>
      </div>
    </div>
  );
};

export default StartScreen; 