
import React from 'react';
import { Laptop, Smartphone, Speaker } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectCreator: () => void;
  onSelectJoiner: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectCreator, onSelectJoiner }) => {
  return (
    <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 mb-6 neon-glow">
          <Speaker className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight neon-text bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          AudioStream QR
        </h1>
        <p className="text-slate-400 font-light text-lg">
          Zero-latency system audio sharing.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={onSelectCreator}
          className="w-full glass-panel group p-6 rounded-3xl flex items-center space-x-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <Laptop className="w-8 h-8 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold text-slate-100 mb-1">Share Desktop</h3>
            <p className="text-sm text-slate-400">Stream your system audio to a mobile device.</p>
          </div>
        </button>

        <button
          onClick={onSelectJoiner}
          className="w-full glass-panel group p-6 rounded-3xl flex items-center space-x-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <Smartphone className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold text-slate-100 mb-1">Join via QR</h3>
            <p className="text-sm text-slate-400">Scan code and listen in real-time.</p>
          </div>
        </button>
      </div>

      <p className="mt-12 text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
        Secure WebRTC Connection
      </p>
    </div>
  );
};

export default WelcomeScreen;
