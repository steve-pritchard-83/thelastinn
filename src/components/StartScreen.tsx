import React from 'react';
import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="start-screen-overlay">
      <div className="start-screen-content">
        <img src="assets/images/logo.png" alt="The Last Inn Logo" className="start-screen-logo" />
        <button onClick={onStart}>Wake Up!</button>
      </div>
    </div>
  );
};

export default StartScreen; 