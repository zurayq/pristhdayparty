import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Countdown from './components/Countdown';
import CelebrationGallery from './components/CelebrationGallery';
import SendPage from './components/SendPage';

function Home() {
  const [isCelebration, setIsCelebration] = useState(false);
  const navigate = useNavigate();
  
  // Secret Early Access States
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handleSecretSubmit = () => {
    if (passcode === '1234') { 
      setIsCelebration(true);
      setShowSecretPrompt(false);
    } else {
      setPasscodeError('Incorrect passcode');
    }
  };
  
  // Target date: April 22, 2026
  const [targetDate] = useState(() => new Date('2026-04-22T00:00:00'));

  useEffect(() => {
    if (isCelebration) {
      document.body.classList.add('celebration-mode');
    } else {
      document.body.classList.remove('celebration-mode');
    }
  }, [isCelebration]);

  return (
    <div className="app-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Dev Tools - Easy testing */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 100 }}>
        <button 
          onClick={() => setIsCelebration(!isCelebration)}
          style={{ 
            background: 'rgba(0,0,0,0.5)', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          Toggle Celebration
        </button>
      </div>

      {!isCelebration ? (
        <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10vh' }}>
          <h1 className="gradient-text" style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '20px' }}>
            The Big Surprise!
          </h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '40px', fontSize: '1.2rem' }}>
            We're preparing something special for the Birthday Child. Record your video message before time runs out!
          </p>
          
          <Countdown 
            targetDate={targetDate} 
            onComplete={() => setIsCelebration(true)} 
            onSecretUnlock={() => setShowSecretPrompt(true)} 
          />
          
          <button 
            className="glass-panel"
            onClick={() => navigate('/send')}
            style={{
              marginTop: '40px',
              padding: '16px 32px',
              fontSize: '1.2rem',
              color: 'white',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              border: 'none',
              borderRadius: '30px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Record Your Surprise 🎁
          </button>
        </div>
      ) : (
        <CelebrationGallery />
      )}

      {/* Secret Gallery Override Prompt */}
      {showSecretPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '300px', width: '100%' }}>
            <h3 style={{ marginBottom: '20px', color: 'white' }}>Do you want to enter the video gallery?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>Enter passcode for early access.</p>
            <input 
              type="password" 
              value={passcode} 
              onChange={(e) => setPasscode(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.4)', color: 'white' }}
            />
            {passcodeError && <p style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem' }}>{passcodeError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                onClick={() => { setShowSecretPrompt(false); setPasscode(''); setPasscodeError(''); }} 
                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSecretSubmit} 
                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/send" element={<SendPage />} />
    </Routes>
  );
}

export default App;
