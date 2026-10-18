import { memo } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useSessionStore } from '../../stores/sessionStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LobbyViewProps {
  onStart: () => void;
  shouldAnimate?: boolean;
}

export const LobbyView = memo(function LobbyView({ onStart: _onStart, shouldAnimate = true }: LobbyViewProps) {
  const session = useSessionStore((s) => s.session);
  const participantsList = useSessionStore((s) => s.participants);
  const prefersReduced = useReducedMotion();

  if (!session) return null;

  const joinUrl = window.location.origin + '/';
  const participantCount = participantsList.length;
  const animate = shouldAnimate && !prefersReduced;

  return (
    <div className="flex gap-8 h-full">
      {/* Left Side - Access Info */}
      <div className="w-1/3 flex flex-col items-center justify-center bg-white rounded-xl shadow p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Join at {joinUrl}</h2>
        <div className="bg-primary-50 p-4 border border-primary-100 rounded-lg mb-8">
          <p className="text-sm text-primary-600 font-semibold mb-1">Game Code</p>
          <p className="text-5xl font-black text-primary-600 tracking-widest uppercase">
            {session.gameCode}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <QRCodeSVG value={`${joinUrl}?code=${session.gameCode}`} size={200} />
        </div>
      </div>

      {/* Right Side - Participants */}
      <div className="flex-1 bg-white rounded-xl shadow p-8 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Oyuncular</h3>
          <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-700 text-xl">
            {participantCount}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {participantsList.map((p) =>
              animate ? (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="bg-gray-50 px-4 py-3 rounded-lg text-center border border-gray-200 font-semibold text-gray-700 shadow-sm"
                >
                  {p.nickname}
                </motion.div>
              ) : (
                <div
                  key={p.id}
                  className="bg-gray-50 px-4 py-3 rounded-lg text-center border border-gray-200 font-semibold text-gray-700 shadow-sm"
                >
                  {p.nickname}
                </div>
              )
            )}
            {participantCount === 0 && (
              <div className="col-span-full text-center text-gray-400 mt-12 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                Oyuncuların katılması bekleniyor...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});