import { useEffect, useRef } from 'react';
import { gameHubService } from '../services/signalr/gameHubService';
import type { GameParticipant } from '../types/game.types';

export interface GameHubHandlers {
  onPlayerJoined?: (participant: GameParticipant) => void;
  onQuestionStarted?: (question: any, timeLimit: number) => void;
  onTimerTick?: (data: { remainingSeconds: number }) => void;
  onQuestionFinished?: () => void;
  onAnswerSubmitted?: (data: any) => void;
  onLeaderboardUpdated?: (data: any) => void;
  onShowQuestionResults?: (data: any) => void;
  onManualReviewRequired?: () => void;
  onGameResumed?: () => void;
  onImageHidden?: () => void;
  onGameEnded?: (finalLeaderboard: any) => void;
}

interface UseGameHubConnectionOptions {
  getToken?: () => string | null;
  enabled?: boolean;
}

const defaultGetToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('playerToken');

/**
 * Registers SignalR handlers through stable wrapper functions so the effect
 * only depends on the session id. Handlers are read from a ref that is
 * refreshed on every render via useEffect, which removes the 15+ dependency chain
 * and the re-subscribe/memory-leak risk of inline registrations.
 */
export function useGameHubConnection(
  sessionId: string | undefined,
  handlers: GameHubHandlers,
  options: UseGameHubConnectionOptions = {}
) {
  const handlersRef = useRef(handlers);
  const getTokenRef = useRef(options.getToken ?? defaultGetToken);

  // Update refs in useEffect to avoid render-time side effects
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    getTokenRef.current = options.getToken ?? defaultGetToken;
  }, [options.getToken]);

  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const token = getTokenRef.current();
    if (!token) return;

    let disposed = false;

    const subscriptions: Array<() => void> = [
      () => gameHubService.onPlayerJoined((p) => handlersRef.current.onPlayerJoined?.(p)),
      () =>
        gameHubService.onQuestionStarted((q, t) =>
          handlersRef.current.onQuestionStarted?.(q, t)
        ),
      () =>
        gameHubService.onTimerTick((data) => handlersRef.current.onTimerTick?.(data)),
      () => gameHubService.onQuestionFinished(() => handlersRef.current.onQuestionFinished?.()),
      () =>
        gameHubService.onAnswerSubmitted((data) =>
          handlersRef.current.onAnswerSubmitted?.(data)
        ),
      () =>
        gameHubService.onLeaderboardUpdated((data) =>
          handlersRef.current.onLeaderboardUpdated?.(data)
        ),
      () =>
        gameHubService.onShowQuestionResults((data) =>
          handlersRef.current.onShowQuestionResults?.(data)
        ),
      () =>
        gameHubService.onManualReviewRequired(() =>
          handlersRef.current.onManualReviewRequired?.()
        ),
      () => gameHubService.onGameResumed(() => handlersRef.current.onGameResumed?.()),
      () => gameHubService.onImageHidden(() => handlersRef.current.onImageHidden?.()),
      () =>
        gameHubService.onGameEnded((data) => handlersRef.current.onGameEnded?.(data))
    ];

    gameHubService
      .connect(token, sessionId)
      .then(() => {
        if (disposed) return;
        subscriptions.forEach((subscribe) => subscribe());
      })
      .catch((error) => {
        console.error('SignalR connection failed:', error);
      });

    return () => {
      disposed = true;
      gameHubService.disconnect();
    };
  }, [sessionId, enabled]);
}
