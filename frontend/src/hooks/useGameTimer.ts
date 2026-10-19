import { useEffect, useRef, useState, type RefObject, useCallback } from 'react';

interface UseGameTimerOptions {
  duration: number;
  serverRemaining?: number | null;
  active?: boolean;
  paused?: boolean;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
  barRef?: RefObject<HTMLElement | null>;
}

/**
 * Hybrid timer: SignalR ticks stay the source of truth while a rAF loop
 * interpolates the displayed seconds and the progress bar between ticks.
 * React state only updates on whole-second changes (max 1 render/sec).
 * When `paused` is true the interpolation freezes in place and resumes from
 * the exact frozen value, so no time is lost or gained across a pause.
 */
export function useGameTimer({
  duration,
  serverRemaining,
  active = true,
  paused = false,
  onTick,
  onComplete,
  barRef
}: UseGameTimerOptions) {
  const initialRemaining = Math.max(0, serverRemaining ?? duration);
  const [secondsRemaining, setSecondsRemaining] = useState(initialRemaining);

  const anchorRef = useRef({ at: 0, remaining: initialRemaining });
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  const pausedRef = useRef(paused);
  const wasPausedRef = useRef(paused);
  const lastSecondRef = useRef(initialRemaining);
  const completedRef = useRef(false);

  // Update refs in useEffect to avoid render-time side effects
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

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

  const writeBar = useCallback(
    (progress: number) => {
      if (barRef?.current) {
        barRef.current.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
      }
    },
    [barRef]
  );

  // Server tick -> re-anchor the client clock (source of truth).
  useEffect(() => {
    if (serverRemaining == null) return;
    const clamped = Math.max(0, serverRemaining);
    anchorRef.current = { at: performance.now(), remaining: clamped };
    if (clamped > 0) completedRef.current = false;
    emitSecond(clamped);
  }, [serverRemaining, emitSecond]);

  // Pause -> freeze at the currently interpolated value.
  // Resume -> restart the clock from that frozen value (no time lost/gained).
  useEffect(() => {
    const wasPaused = wasPausedRef.current;
    wasPausedRef.current = paused;
    if (!active || wasPaused === paused) return;

    const now = performance.now();
    const { at, remaining } = anchorRef.current;

    if (paused) {
      const elapsed = at > 0 ? (now - at) / 1000 : 0;
      const frozen = Math.max(0, remaining - elapsed);
      anchorRef.current = { at: now, remaining: frozen };
      writeBar(duration > 0 ? frozen / duration : 0);
      emitSecond(Math.ceil(frozen - 1e-6));
    } else {
      anchorRef.current = { at: now, remaining };
      writeBar(duration > 0 ? remaining / duration : 0);
      emitSecond(Math.ceil(remaining - 1e-6));
    }
  }, [paused, active, duration, emitSecond, writeBar]);

  // rAF interpolation loop: smooth progress bar + whole-second display.
  // It keeps running while paused but stops subtracting elapsed time.
  useEffect(() => {
    if (!active) return;

    const now = performance.now();
    if (pausedRef.current) {
      anchorRef.current = { at: now, remaining: anchorRef.current.remaining };
    } else {
      const initial = serverRemaining != null ? serverRemaining : lastSecondRef.current;
      anchorRef.current = { at: now, remaining: initial };
      if (initial > 0) completedRef.current = false;
    }

    writeBar(duration > 0 ? lastSecondRef.current / duration : 0);

    let frameId = 0;
    const frame = () => {
      const { at, remaining } = anchorRef.current;
      const isPaused = pausedRef.current;
      const elapsed = isPaused ? 0 : (performance.now() - at) / 1000;
      const smooth = Math.max(0, remaining - elapsed);

      writeBar(duration > 0 ? smooth / duration : 0);
      emitSecond(Math.ceil(smooth - 1e-6));

      if (smooth <= 0 && !isPaused) {
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
  }, [duration, active, barRef, emitSecond, writeBar, serverRemaining]);

  return { secondsRemaining };
}
