import { useState, useEffect } from 'react';

const TimeUnit = ({ value, label }) => (
  <div className="glass-panel" style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '15px 20px', minWidth: '70px', margin: '0 5px'
  }}>
    <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1, fontFamily: 'var(--font-heading)' }}>
      {value.toString().padStart(2, '0')}
    </span>
    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '5px' }}>
      {label}
    </span>
  </div>
);

export default function Countdown({ targetDate, onComplete, onSecretUnlock }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });
  const [clickCount, setClickCount] = useState(0);

  const handleContainerClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        if (onSecretUnlock) onSecretUnlock();
        return 0; // reset
      }
      return newCount;
    });
  };

  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => setClickCount(0), 1000); // 1 second rule for rapid taps
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      let timeLeft = {};

      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      } else {
        timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        if (onComplete) onComplete();
      }

      return timeLeft;
    };

    setTimeLeft(calculateTimeLeft());
    
    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Stop the timer if 0
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  return (
    <div onClick={handleContainerClick} style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'default' }}>
      <TimeUnit value={timeLeft.days} label="Days" />
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <TimeUnit value={timeLeft.minutes} label="Mins" />
      <TimeUnit value={timeLeft.seconds} label="Secs" />
    </div>
  );
}
