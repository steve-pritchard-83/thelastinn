import { useState, useEffect } from 'react';
import { useInterval } from '../hooks/useInterval';

interface TypewriterProps {
  text: string;
  speed?: number;
  onTypingComplete?: () => void;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 50, onTypingComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCharIndex(0);
  }, [text]);

  useInterval(() => {
    if (charIndex < text.length) {
      setDisplayedText((prev) => prev + text.charAt(charIndex));
      setCharIndex((prev) => prev + 1);
    } else {
      // Stop the interval by not calling anything, and trigger the callback
      if (onTypingComplete) {
        onTypingComplete();
      }
    }
  }, charIndex < text.length ? speed : null); // Conditionally start/stop the interval

  return <p className="typewriter-text">{displayedText}</p>;
};

export default Typewriter; 