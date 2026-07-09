import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useGame } from '../../state/GameProvider';

export function CelebrationLayer() {
  const { confettiToken, settings } = useGame();
  const [burst, setBurst] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (confettiToken === 0 || !settings.confettiEnabled) return;
    setBurst(confettiToken);
    const t = window.setTimeout(() => setBurst(0), 4500);
    return () => window.clearTimeout(t);
  }, [confettiToken, settings.confettiEnabled]);

  if (!burst || !settings.confettiEnabled || size.w === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <Confetti
        width={size.w}
        height={size.h}
        numberOfPieces={220}
        recycle={false}
        gravity={0.22}
        colors={['#34d399', '#2dd4bf', '#22d3ee', '#a7f3d0', '#fbbf24', '#c084fc']}
      />
    </div>
  );
}
