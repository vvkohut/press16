import { useEffect, useState } from 'react';

interface Props {
  endsAt: number;
  onClose: () => void;
}

export function RestTimer({ endsAt, onClose }: Props) {
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const finished = remaining === 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (finished) navigator.vibrate?.([200, 100, 200]);
  }, [finished]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className={finished ? 'timer finished' : 'timer'} role="timer">
      <span>{finished ? 'Rest over — next set' : `Rest ${mm}:${ss}`}</span>
      <button className="link" onClick={onClose} aria-label="Close timer">
        ✕
      </button>
    </div>
  );
}
