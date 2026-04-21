import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Camera, StopCircle, RefreshCw, Send, CheckCircle } from 'lucide-react';

const MAX_RECORDING_TIME = 30; // 30 seconds limit

export default function SendPage() {
  const navigate = useNavigate();
  
  // Camera & Video States
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(MAX_RECORDING_TIME);
  const [cameraError, setCameraError] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const liveVideoRef = useRef(null);
  const recordedChunks = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const durationRef = useRef(0);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Stop camera helper
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    // Start camera immediately on mount
    startCamera();
    return () => {
      stopCamera();
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isRecording && recordingTimeLeft > 0) {
      interval = setInterval(() => {
        setRecordingTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRecording && recordingTimeLeft <= 0) {
      stopRecording();
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingTimeLeft]);

  const startCamera = async () => {
    setCameraError('');
    try {
      // Low-bandwidth friendly constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        },
        audio: {
          channelCount: 1,
          sampleRate: 22050,
        }
      });
      setStream(mediaStream);

      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = mediaStream;
        }
      }, 100);
      
    } catch (err) {
      console.error("Camera access denied or failed", err);
      setCameraError("Camera access required to record a message.");
    }
  };

  const startRecording = () => {
    if (!stream) return;
    recordedChunks.current = [];
    setRecordingTimeLeft(MAX_RECORDING_TIME);
    
    // Choose appropriate mimeType for low bandwidth
    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' }; 
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
         options = { mimeType: 'video/mp4' }; // Safari fallback
      }
    }
    
    // Attempt low bits per second to keep file size down
    options.videoBitsPerSecond = 500000; // 500 kbps

    const mediaRecorder = new MediaRecorder(stream, options);
    recordingStartTimeRef.current = Date.now();
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const actualDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
      durationRef.current = actualDuration;

      const blob = new Blob(recordedChunks.current, { type: options.mimeType });
      const file = new File([blob], `video-${Date.now()}.webm`, { type: options.mimeType });
      
      setVideoFile(file);
      const url = URL.createObjectURL(blob);
      setVideoPreviewUrl(url);
      stopCamera(); 
    };

    mediaRecorder.start(1000); // 1-second chunks
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retakeVideo = () => {
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setRecordingTimeLeft(MAX_RECORDING_TIME);
    durationRef.current = 0;
    startCamera();
  };

  const handleSend = async () => {
    if (!videoFile) return;
    setIsSubmitting(true);
    setProgress(0);
    
    try {
      let videoUrl = null;

      // Handle missing API Key (dev env mock mode)
      if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "YOUR_API_KEY") {
        videoUrl = videoPreviewUrl;
      } else {
        const storageRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, videoFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(p); 
            },
            (error) => {
              console.error("Storage Error:", error);
              reject(error);
            },
            async () => {
              try {
                videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      }

      // Save to 'videos' collection
      if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY") {
        await addDoc(collection(db, "videos"), {
          videoUrl: videoUrl,
          duration: durationRef.current,
          createdAt: serverTimestamp(),
        });
      } else {
         // Mock save
         const local = JSON.parse(localStorage.getItem('mockVideos') || '[]');
         local.push({ id: Date.now().toString(), videoUrl: videoPreviewUrl, duration: durationRef.current, createdAt: new Date() });
         localStorage.setItem('mockVideos', JSON.stringify(local));
      }

      setProgress(100);
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      console.error(err);
      alert("Failed to submit recording. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#000', color: 'white', padding: '20px', textAlign: 'center' }}>
        <CheckCircle size={80} color="#34d399" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Sent!</h2>
        <p style={{ color: '#aaa' }}>Your message has been safely stored.</p>
        <p style={{ color: '#aaa', marginTop: '10px', fontSize: '0.9rem' }}>Taking you back to the home page...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Bar Navigation */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <button onClick={() => navigate('/')} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>

      {cameraError && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ef4444', textAlign: 'center', padding: '20px' }}>
          <p>{cameraError}</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '8px' }}>Go Back</button>
        </div>
      )}

      {/* Video Viewport */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {!videoFile ? (
          <video 
            ref={liveVideoRef} 
            autoPlay 
            muted 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
          />
        ) : (
          <video 
            src={videoPreviewUrl} 
            controls 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        )}

        {/* Progress overlay while submitting */}
        {isSubmitting && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
            <div style={{ width: '80%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
            <p style={{ color: 'white', marginTop: '15px' }}>Uploading... {Math.round(progress)}%</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{ padding: '30px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)', position: 'absolute', bottom: 0, width: '100%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
        {!videoFile ? (
          !isRecording ? (
            <button 
              onClick={startRecording}
              style={{
                width: '70px', height: '70px', borderRadius: '50%', background: '#ef4444', border: '4px solid white', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
              }}
            >
              <Camera size={32} color="white" />
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                00:{recordingTimeLeft.toString().padStart(2, '0')}
              </span>
              <button 
                onClick={stopRecording}
                style={{
                  width: '70px', height: '70px', borderRadius: '15px', background: '#ef4444', border: '4px solid white', cursor: 'pointer',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'pulse 1.5s infinite'
                }}
              >
                <StopCircle size={32} color="white" />
              </button>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '400px' }}>
            <button 
              onClick={retakeVideo}
              disabled={isSubmitting}
              style={{
                flex: 1, padding: '16px', borderRadius: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.1rem',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', backdropFilter: 'blur(10px)'
              }}
            >
              <RefreshCw size={20} /> Retake
            </button>
            <button 
              onClick={handleSend}
              disabled={isSubmitting}
              style={{
                flex: 1, padding: '16px', borderRadius: '30px', background: 'var(--accent-primary)', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: 'bold',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
              }}
            >
              <Send size={20} /> Send
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
