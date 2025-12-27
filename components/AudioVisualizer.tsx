
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let animationId: number;

    const render = () => {
      if (!ctx) return;
      animationId = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient color for bars
        const hue = 260 + (i * 2); // Ranges from purple to blue
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
        
        // Rounded bar drawing
        const radius = 4;
        const barX = x;
        const barY = canvas.height - barHeight;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(barX, barY, barWidth - 4, barHeight, radius);
        } else {
            ctx.rect(barX, barY, barWidth - 4, barHeight);
        }
        ctx.fill();

        x += barWidth;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      audioContext.close();
    };
  }, [stream]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      width={300} 
      height={100}
    />
  );
};

export default AudioVisualizer;
