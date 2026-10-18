import { useEffect, useRef, useState, type RefObject, useCallback } from 'react';

interface UseGameTimerOptions {
  duration: number;
  serverRemaining?: number | null;
  active?: boolean;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
  barRef?: RefObject<HTMLElement | null>;
}

/**
 * Hybrid timer: SignalR ticks stay the source of truth while a rAF loop
 * interpolates the displayed seconds and the progress bar between ticks.
 * React state only updates on whole-second changes (max 1 render/sec).
 */
export function useGameTimer({
  duration,
  serverRemaining,
  active = true,
  onTick,
  onComplete,
  barRef
}: UseGameTimerOptions) {
  const initialRemaining = Math.max(0, serverRemaining ?? duration);
  const [secondsRemaining, setSecondsRemaining] = useState(initialRemaining);

  const anchorRef = useRef({ at: 0, remaining: initialRemaining });
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  const lastSecondRef = useRef(initialRemaining);
  const completedRef = useRef(false);

  // Update refs in useEffect to avoid render-time side effects
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const emitSecond = useCallback((value: number) => {
    if (value === lastSecondRef.current) return;
    lastSecondRef.current = value;
    setSecondsRemaining(value);
    onTickRef.current?.(value);
    if (value <= 0 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  }, []);

  // Server tick -> re-anchor the client clock (source of truth).
  useEffect(() => {
    if (serverRemaining == null) return;
    const clamped = Math.max(0, serverRemaining);
    anchorRef.current = { at: performance.now(), remaining: clamped };
    if (clamped > 0) completedRef.current = false;
    emitSecond(clamped);
  }, [serverRemaining, emitSecond]);

  // rAF interpolation loop: smooth progress bar + whole-second display.
  useEffect(() => {
    if (!active) return;

    anchorRef.current = { at: performance.now(), remaining: lastSecondRef.current };
    if (lastSecondRef.current > 0) completedRef.current = false;

    const writeBar = (progress: number) => {
      if (barRef?.current) {
        barRef.current.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
      }
    };

    writeBar(duration > 0 ? lastSecondRef.current / duration : 0);

    let frameId = 0;
    const frame = () => {
      const { at, remaining } = anchorRef.current;
      const elapsed = (performance.now() - at) / 1000;
      const smooth = Math.max(0, remaining - elapsed);

      writeBar(duration > 0 ? smooth / duration : 0);
      emitSecond(Math.ceil(smooth - 1e-6));

      if (smooth <= 0) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
        return;
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(frameId);
  }, [duration, active, barRef, emitSecond]);

  return { secondsRemaining };
}
