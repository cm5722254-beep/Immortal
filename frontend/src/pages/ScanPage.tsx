import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Copy, QrCode } from 'lucide-react';

export function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    let stream: MediaStream | undefined;
    let frame = 0;
    let active = true;
    const begin = async () => {
      try {
        const detectorCtor = (window as any).BarcodeDetector;
        if (!detectorCtor) { setError('QR scanning is not supported here. Paste a QR link below.'); return; }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const detector = new detectorCtor({ formats: ['qr_code'] });
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) { setResult(codes[0].rawValue); stream?.getTracks().forEach((track) => track.stop()); return; }
          } catch { /* Camera can deliver frames before it is ready. */ }
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch {
        setError('Camera access is unavailable. Allow camera access or paste a QR link below.');
      }
    };
    void begin();
    return () => { active = false; cancelAnimationFrame(frame); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  const openResult = () => {
    const value = (result || manualValue).trim();
    if (!value) return;
    if (/^https?:\/\//i.test(value)) {
      try { const target = new URL(value); if (target.origin === window.location.origin) { navigate(`${target.pathname}${target.search}${target.hash}`); return; } } catch {}
      window.open(value, '_blank', 'noopener,noreferrer');
    } else setResult(value);
  };

  return <main className="mini-scan-page"><div className="mini-page-title"><Link to="/profile" aria-label="Back"><ArrowLeft /></Link><h1>Scan QR Code</h1></div>
    <div className="mini-scan-frame"><video ref={videoRef} muted playsInline /><div className="mini-scan-corner" /><span /></div>
    <p>{result ? 'QR code detected' : error || 'Point your camera at a QR code'}</p>
    {result && <div className="mini-scan-result"><QrCode /><span>{result}</span><button onClick={() => navigator.clipboard.writeText(result)} aria-label="Copy result"><Copy /></button><button onClick={openResult}>Open</button></div>}
    <label className="mini-scan-manual"><Camera /> Paste QR content<input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="https://…" /></label>
    <button className="mini-scan-open" onClick={openResult} disabled={!manualValue.trim()}>Continue</button>
  </main>;
}
