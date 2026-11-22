// Top-of-screen notice shown while the live game connection is down; mounted once in App.tsx.
// Stays hidden for short blips so a one-second hiccup does not flash a warning.
import { useEffect, useState } from 'react';
import { gameHubService, type HubStatus } from '../../services/signalr/gameHubService';

const SHOW_AFTER_MS = 1500;

export default function ConnectionBanner() {
  const [status, setStatus] = useState<HubStatus>(gameHubService.getStatus());
  const [visible, setVisible] = useState(false);

  useEffect(() => gameHubService.onStatusChange(setStatus), []);

  useEffect(() => {
    if (status !== 'reconnecting') {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-center text-sm font-semibold px-4 py-2 shadow"
    >
      Bağlantı koptu, yeniden bağlanılıyor… Sayfayı kapatma.
    </div>
  );
}
