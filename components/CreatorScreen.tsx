
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../App';
import { ref, onValue, set, update, push, onChildAdded } from 'firebase/database';
import { Activity, X, MicOff, Mic, Settings, AlertCircle, Loader2 } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import { AudioQuality } from '../types';

interface CreatorScreenProps {
  roomId: string | null;
  setRoomId: (id: string) => void;
  onDisconnect: () => void;
}

const CreatorScreen: React.FC<CreatorScreenProps> = ({ roomId, setRoomId, onDisconnect }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [quality, setQuality] = useState<AudioQuality>('high');
  const [errorMessage, setErrorMessage] = useState('');

  const candidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Generate a random Room ID
  useEffect(() => {
    if (!roomId) {
      const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomId(newId);
    }
  }, [roomId, setRoomId]);

  const startStreaming = async () => {
    try {
      setStatus('IDLE');
      // Request system audio (getDisplayMedia is best for desktop system audio)
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Chromium requires video: true to show "Share system audio"
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Filter to keep only audio
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track selected. Please check 'Share system audio' in the selector.");
      }
      
      // Stop the video track immediately as we only want audio
      mediaStream.getVideoTracks().forEach(t => t.stop());
      
      const filteredStream = new MediaStream([audioTrack]);
      setStream(filteredStream);
      
      // Initialize WebRTC
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && roomId) {
          const iceRef = ref(db, `rooms/${roomId}/creatorIceCandidates`);
          push(iceRef, event.candidate.toJSON());
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') setStatus('CONNECTED');
        if (peerConnection.connectionState === 'failed') setStatus('ERROR');
      };

      filteredStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, filteredStream);
      });

      // Create Offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Save to Firebase
      if (roomId) {
        await set(ref(db, `rooms/${roomId}`), {
          offer: { type: offer.type, sdp: offer.sdp },
          status: 'waiting'
        });
        setStatus('WAITING');
      }

      setPc(peerConnection);

      // Listen for Answer
      const answerRef = ref(db, `rooms/${roomId}/answer`);
      onValue(answerRef, async (snapshot) => {
        const data = snapshot.val();
        if (data && peerConnection.signalingState !== 'stable') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        }
      });

      // Listen for Joiner ICE Candidates
      const joinerIceRef = ref(db, `rooms/${roomId}/joinerIceCandidates`);
      onChildAdded(joinerIceRef, (snapshot) => {
        const candidate = snapshot.val();
        if (candidate) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to start audio capture.");
      setStatus('ERROR');
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="glass-panel rounded-[2.5rem] p-8 relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className="text-sm font-medium text-slate-300 uppercase tracking-widest">
              {status === 'WAITING' ? 'Waiting for Receiver' : status === 'CONNECTED' ? 'Live Streaming' : 'Ready to Start'}
            </span>
          </div>
          <button onClick={onDisconnect} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {status === 'IDLE' || status === 'ERROR' ? (
          <div className="text-center py-12">
            {status === 'ERROR' ? (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start space-x-3 text-left">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <p className="text-red-200 text-sm">{errorMessage}</p>
              </div>
            ) : (
              <p className="text-slate-400 mb-8 px-4">Click below and ensure "Share system audio" is enabled in the pop-up.</p>
            )}
            <button
              onClick={startStreaming}
              className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all neon-glow"
            >
              Start System Share
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* QR Code Section */}
            {status === 'WAITING' && (
              <div className="bg-white p-6 rounded-3xl mb-8 animate-in zoom-in duration-500 shadow-2xl">
                <QRCodeSVG value={roomId || ''} size={200} level="H" />
                <div className="mt-4 text-center">
                  <p className="text-slate-900 text-xs font-bold uppercase tracking-tighter mb-1">Room ID</p>
                  <p className="text-slate-900 text-2xl font-black">{roomId}</p>
                </div>
              </div>
            )}

            {/* Visualizer and Controls */}
            <div className="w-full space-y-8">
              <div className="h-24 bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden">
                {stream ? <AudioVisualizer stream={stream} /> : <div className="text-slate-600 text-sm italic">Initializing Visualizer...</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleMute}
                  className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border transition-all ${isMuted ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/40 border-white/5'}`}
                >
                  {isMuted ? <MicOff className="w-8 h-8 text-red-400 mb-2" /> : <Mic className="w-8 h-8 text-purple-400 mb-2" />}
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{isMuted ? 'Muted' : 'Mute'}</span>
                </button>

                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-[2rem] flex flex-col items-center justify-center">
                  <Settings className="w-8 h-8 text-blue-400 mb-2" />
                  <select 
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as AudioQuality)}
                    className="bg-transparent text-xs font-bold uppercase tracking-widest text-slate-400 focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low Quality</option>
                    <option value="medium">Medium</option>
                    <option value="high">HD Audio</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-slate-500">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-medium">P2P Encryption Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorScreen;
