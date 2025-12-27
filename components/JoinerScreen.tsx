
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../App.tsx';
import { ref, set, push, onChildAdded, get } from 'firebase/database';
import { X, Camera, Volume2, RefreshCw, AlertCircle, Headphones, Wifi, Keyboard, ChevronRight } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer.tsx';

interface JoinerScreenProps {
  onDisconnect: () => void;
}

const JoinerScreen: React.FC<JoinerScreenProps> = ({ onDisconnect }) => {
  const [step, setStep] = useState<'SCANNING' | 'MANUAL' | 'CONNECTING' | 'LISTENING' | 'ERROR'>('SCANNING');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [roomId, setRoomId] = useState('');
  const [manualId, setManualId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [latency, setLatency] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (step === 'SCANNING') {
      const startScanner = async () => {
        try {
          setTimeout(() => {
            const html5QrcodeScanner = new (window as any).Html5QrcodeScanner(
              "reader", 
              { fps: 10, qrbox: {width: 250, height: 250} },
              false
            );
            
            html5QrcodeScanner.render((decodedText: string) => {
              html5QrcodeScanner.clear();
              setRoomId(decodedText);
              connectToRoom(decodedText);
            }, (error: any) => {});
            
            scannerRef.current = html5QrcodeScanner;
          }, 100);
        } catch (err) {
          console.error("Scanner init error:", err);
          setErrorMessage("Camera access required for scanning.");
          setStep('ERROR');
        }
      };
      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e: any) => console.log(e));
      }
    };
  }, [step]);

  const connectToRoom = async (id: string) => {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return;

    setRoomId(cleanId);
    setStep('CONNECTING');
    try {
      const roomRef = ref(db, `rooms/${cleanId}`);
      const snapshot = await get(roomRef);
      const roomData = snapshot.val();

      if (!roomData || !roomData.offer) {
        throw new Error("Room not found or no offer available. Please check the ID.");
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pcRef.current = peerConnection;

      peerConnection.ontrack = (event) => {
        const incomingStream = event.streams[0];
        setStream(incomingStream);
        if (audioRef.current) {
          audioRef.current.srcObject = incomingStream;
          audioRef.current.play().catch(e => console.log("Auto-play blocked"));
        }
        setStep('LISTENING');
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const iceRef = ref(db, `rooms/${cleanId}/joinerIceCandidates`);
          push(iceRef, event.candidate.toJSON());
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(roomData.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await set(ref(db, `rooms/${cleanId}/answer`), {
        type: answer.type,
        sdp: answer.sdp
      });

      const creatorIceRef = ref(db, `rooms/${cleanId}/creatorIceCandidates`);
      onChildAdded(creatorIceRef, (snapshot) => {
        const candidate = snapshot.val();
        if (candidate && peerConnection.remoteDescription) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      const start = Date.now();
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          setLatency(Date.now() - start);
        }
      };

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to connect to room.");
      setStep('ERROR');
    }
  };

  const forcePlay = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectToRoom(manualId);
  };

  return (
    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-500">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="glass-panel rounded-[3rem] p-8 relative">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-3">
            <Headphones className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tighter">Receiver Mode</h2>
          </div>
          <button onClick={onDisconnect} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {step === 'SCANNING' && (
          <div className="flex flex-col items-center">
            <div id="reader" className="w-full max-w-[280px] overflow-hidden rounded-[2rem] border-2 border-dashed border-slate-700 bg-slate-900/50 mb-8 aspect-square relative">
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
                  <Camera className="w-16 h-16 text-slate-600" />
               </div>
            </div>
            <button 
              onClick={() => {
                if(scannerRef.current) scannerRef.current.clear();
                setStep('MANUAL');
              }}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors font-medium text-sm"
            >
              <Keyboard className="w-4 h-4" />
              <span>Enter ID Manually</span>
            </button>
          </div>
        )}

        {step === 'MANUAL' && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="w-full max-w-sm">
              <h3 className="text-center text-slate-300 font-semibold mb-6">Enter 6-digit Room ID</h3>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <input 
                  type="text" 
                  autoFocus
                  maxLength={6}
                  placeholder="E.G. A1B2C3"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-2xl px-6 py-5 text-3xl font-black text-center text-white tracking-[0.5em] focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-700 placeholder:tracking-normal placeholder:text-sm"
                />
                <button 
                  type="submit"
                  disabled={manualId.length < 3}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Connect to Room</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'CONNECTING' && (
          <div className="py-20 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500/30 border-l-transparent animate-spin mb-8"></div>
            <h3 className="text-xl font-bold mb-2">Establishing Link...</h3>
          </div>
        )}

        {step === 'LISTENING' && (
          <div className="space-y-10">
            <div className="flex flex-col items-center py-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center neon-glow mb-6 shadow-2xl">
                <Volume2 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-100 mb-1">Live Audio</h3>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center">
                <Wifi className="w-3 h-3 mr-1" /> Room {roomId} Connected
              </p>
            </div>

            <div className="h-32 bg-slate-900/80 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden">
               {stream ? <AudioVisualizer stream={stream} /> : <div className="text-slate-600 text-sm">Waiting for signal...</div>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={forcePlay}
                className="col-span-2 py-6 bg-slate-100 rounded-[2rem] text-slate-900 font-bold text-lg hover:bg-white transition-colors flex items-center justify-center"
              >
                <Volume2 className="w-6 h-6 mr-2" /> Start Listening
              </button>
            </div>
          </div>
        )}

        {step === 'ERROR' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-4">Connection Failed</h3>
            <p className="text-slate-400 text-sm mb-8 px-6">{errorMessage}</p>
            <button onClick={() => setStep('SCANNING')} className="px-8 py-3 bg-slate-800 text-slate-100 rounded-2xl font-bold">Retry</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinerScreen;
