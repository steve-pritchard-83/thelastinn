import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import './TimingMeter.css';

interface TimingMeterProps {
  speed?: number; // Speed of the slider
  sweetSpot?: { start: number; end: number }; // The target range (0-100)
}

export interface TimingMeterRef {
  isSuccess: () => boolean;
}

const TimingMeter = forwardRef<TimingMeterRef, TimingMeterProps>(
  ({ speed = 2, sweetSpot = { start: 40, end: 60 } }, ref) => {
    const [position, setPosition] = useState(0);
    const direction = useRef(1);
    const animationFrameId = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      isSuccess: () => {
        return position >= sweetSpot.start && position <= sweetSpot.end;
      },
    }));

    useEffect(() => {
      const animate = () => {
        setPosition(prevPosition => {
          let newPosition = prevPosition + direction.current * speed;
          if (newPosition > 100 || newPosition < 0) {
            direction.current *= -1;
            newPosition = prevPosition + direction.current * speed;
          }
          return newPosition;
        });
        animationFrameId.current = requestAnimationFrame(animate);
      };

      animationFrameId.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    }, [speed]);

    return (
      <div className="timing-meter-container">
        <div className="timing-meter-bar">
          <div
            className="timing-meter-sweet-spot"
            style={{ left: `${sweetSpot.start}%`, width: `${sweetSpot.end - sweetSpot.start}%` }}
          ></div>
          <div className="timing-meter-slider" style={{ left: `${position}%` }}></div>
        </div>
      </div>
    );
  }
);

export default TimingMeter; 