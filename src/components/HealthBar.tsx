import React from 'react';
import './HealthBar.css';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
  label: string;
}

const HealthBar: React.FC<HealthBarProps> = ({ currentHp, maxHp, label }) => {
  const healthPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  return (
    <div className="health-bar-container">
      <div className="health-bar-label">
        <span className="health-bar-label-text"><span className="icon icon-heart">♥</span><span>{label}</span></span>
        <span>{currentHp} / {maxHp}</span>
      </div>
      <div className="health-bar-background">
        <div 
          className="health-bar-foreground" 
          style={{ width: `${healthPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default HealthBar; 