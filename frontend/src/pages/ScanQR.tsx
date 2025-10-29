import { useEffect, useRef, useState } from 'react';

export default function ScanQR() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null;
        const tick = async () => {
          try {
            if (detector && videoRef.current && !videoRef.current.paused) {
              const detections = await detector.detect(videoRef.current);
              if (detections.length) {
                setResult(detections[0].rawValue || '');
              }
            }
          } catch {}
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch {}
    };
    start();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Scanner QR</h2>
      <video ref={videoRef} style={{ width: '100%', maxWidth: 480 }} muted playsInline />
      <p>Résultat: {result}</p>
    </div>
  );
}

