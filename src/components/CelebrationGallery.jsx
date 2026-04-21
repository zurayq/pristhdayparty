import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { supabase } from '../supabase';
import { X } from 'lucide-react';

export default function CelebrationGallery() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [windowDimension, setWindowDimension] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Full-screen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const detectSize = () => {
    setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
  }

  useEffect(() => {
    window.addEventListener('resize', detectSize);
    return () => {
      window.removeEventListener('resize', detectSize);
    }
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) {
          throw new Error(dbError.message);
        }
        
        setVideos(data || []);
      } catch (err) {
        console.error("Error fetching videos", err);
        setError("Could not load videos. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const openViewer = (index) => {
    setCurrentIndex(index);
    setViewerOpen(true);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  };

  const closeViewer = () => {
    setViewerOpen(false);
    // Restore background scrolling
    document.body.style.overflow = 'auto';
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--accent-primary)', fontSize: '2rem' }}>Loading Surprises...</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ef4444', fontSize: '1.5rem', padding: '20px', textAlign: 'center' }}>{error}</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', padding: '20px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <Confetti
        width={windowDimension.width}
        height={windowDimension.height}
        recycle={true}
        numberOfPieces={150}
        colors={['#db2777', '#fb7185', '#fde047', '#818cf8', '#34d399']}
      />
      
      <div style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '20px', position: 'relative', zIndex: 10 }}>
        <h1 className="gradient-text" style={{ fontSize: '4rem', textShadow: '0 4px 15px rgba(219,39,119,0.3)' }}>Happy Birthday! 🎉</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Tap any video to view messages from your friends and family!</p>
      </div>

      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)', fontSize: '1.5rem', position: 'relative', zIndex: 10 }}>
          No videos yet. They are preparing the surprise! 🥺
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '15px',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingBottom: '50px',
          position: 'relative',
          zIndex: 10
        }}>
          {videos.map((vid, idx) => (
            <div 
              key={vid.id} 
              onClick={() => openViewer(idx)}
              style={{ 
                width: '100%', 
                aspectRatio: '9/16', 
                backgroundColor: '#111', 
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <video 
                src={vid.video_url} 
                preload="metadata"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Vertical Viewer */}
      {viewerOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: '#000',
          zIndex: 100,
          display: 'flex', flexDirection: 'column'
        }}>
          <button 
            onClick={closeViewer}
            style={{ position: 'absolute', top: 20, left: 20, zIndex: 110, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          
          <div style={{ flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
            {videos.map((vid, idx) => (
              <div 
                key={`viewer-${vid.id}`}
                style={{
                  height: '100vh',
                  width: '100vw',
                  scrollSnapAlign: 'start',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                <video 
                  src={vid.video_url} 
                  controls
                  playsInline
                  autoPlay={idx === currentIndex}
                  loop
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>

          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
