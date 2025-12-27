
import React, { useState, useEffect, useCallback } from 'react';
import { AppMode } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import CreatorScreen from './components/CreatorScreen';
import JoinerScreen from './components/JoinerScreen';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove } from 'firebase/database';

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAQbZym8Tz1kfDAQGj-n7L0RrQlF4nHsyw",
  authDomain: "audio-51224.firebaseapp.com",
  databaseURL: "https://audio-51224-default-rtdb.firebaseio.com",
  projectId: "audio-51224",
  storageBucket: "audio-51224.firebasestorage.app",
  messagingSenderId: "344855155748",
  appId: "1:344855155748:web:261638d31c9b4a8960f4b1"
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.IDLE);
  const [roomId, setRoomId] = useState<string | null>(null);

  const resetApp = useCallback(async () => {
    if (roomId) {
      const roomRef = ref(db, `rooms/${roomId}`);
      await remove(roomRef);
    }
    setMode(AppMode.IDLE);
    setRoomId(null);
  }, [roomId]);

  useEffect(() => {
    // Handle global errors or cleanups
    const handleUnload = () => {
      if (roomId) {
        const roomRef = ref(db, `rooms/${roomId}`);
        remove(roomRef);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [roomId]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {mode === AppMode.IDLE && (
        <WelcomeScreen 
          onSelectCreator={() => setMode(AppMode.CREATOR)} 
          onSelectJoiner={() => setMode(AppMode.JOINER)} 
        />
      )}

      {mode === AppMode.CREATOR && (
        <CreatorScreen 
          roomId={roomId} 
          setRoomId={setRoomId} 
          onDisconnect={resetApp} 
        />
      )}

      {mode === AppMode.JOINER && (
        <JoinerScreen 
          onDisconnect={resetApp} 
        />
      )}
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
};

export default App;
