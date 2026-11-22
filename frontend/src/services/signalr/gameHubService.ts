// Singleton SignalR client for /gamehub, used by useGameHubConnection.
// The connection never gives up on its own: phones drop sockets when the screen locks or the
// user switches apps, so it retries forever and restarts as soon as the page is visible again.
import { HubConnection, HubConnectionBuilder, HubConnectionState, HttpTransportType } from '@microsoft/signalr';

export type HubStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

// Delays between automatic reconnect attempts; after the list ends it keeps trying every 5 s.
const RECONNECT_DELAYS_MS = [0, 1000, 2000, 5000];
const RESTART_INTERVAL_MS = 5000;

class GameHubService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectedCallbacks: Set<() => void> = new Set();
  private statusCallbacks: Set<(status: HubStatus) => void> = new Set();
  private status: HubStatus = 'idle';
  private sessionId: string | undefined;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private listenersAttached = false;

  public async connect(token: string, sessionId?: string) {
    this.sessionId = sessionId;
    this.attachPageListeners();

    if (this.connectionPromise) {
      await this.connectionPromise;
      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
      return;
    }

    this.connectionPromise = this._connectInternal(token, sessionId);
    await this.connectionPromise;
  }

  public getStatus(): HubStatus {
    return this.status;
  }

  // Registers a status listener (for the "connection lost" banner) and returns an unsubscribe function.
  public onStatusChange(callback: (status: HubStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private setStatus(status: HubStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusCallbacks.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error('Error in status callback:', err);
      }
    });
  }

  private async _connectInternal(token: string, sessionId?: string) {
    if (this.connection) {
      const oldConn = this.connection;
      this.connection = null;
      this.isConnected = false;
      try { await oldConn.stop(); } catch (e) {}
    }

    const conn = new HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5294/gamehub', {
        accessTokenFactory: () => token,
        transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          RECONNECT_DELAYS_MS[ctx.previousRetryCount] ?? RESTART_INTERVAL_MS
      })
      .build();

    this.connection = conn;
    this.setStatus('connecting');

    conn.onreconnecting(() => {
      if (this.connection !== conn) return;
      console.log('SignalR reconnecting...');
      this.isConnected = false;
      this.setStatus('reconnecting');
    });

    conn.onreconnected(async (connectionId) => {
      if (this.connection !== conn) return;
      console.log('SignalR reconnected:', connectionId);
      await this.handleBackOnline();
    });

    // Fires when automatic reconnect could not recover (e.g. the browser froze the tab).
    // The same connection object is restarted so every registered event handler stays attached.
    conn.onclose(() => {
      if (this.connection !== conn) return;
      console.log('SignalR disconnected, scheduling restart');
      this.isConnected = false;
      this.setStatus('reconnecting');
      this.scheduleRestart(RESTART_INTERVAL_MS);
    });

    try {
      await conn.start();
      if (this.connection !== conn) return;
      this.isConnected = true;
      this.setStatus('connected');
      console.log('SignalR Connected!');

      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
    } catch (e) {
      if (this.connection === conn) {
        console.error('SignalR Connection Error: ', e);
        this.setStatus('reconnecting');
        this.scheduleRestart(RESTART_INTERVAL_MS);
      }
    }
  }

  // Rejoins the session group and lets pages re-sync state they may have missed while offline.
  private async handleBackOnline() {
    this.isConnected = true;
    this.setStatus('connected');
    if (this.sessionId) {
      await this.joinGameGroup(this.sessionId);
    }
    this.reconnectedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in onReconnected callback:', err);
      }
    });
  }

  private scheduleRestart(delayMs: number) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.restartNow();
    }, delayMs);
  }

  // Restarts a fully closed connection; does nothing while connected or already reconnecting.
  private async restartNow() {
    const conn = this.connection;
    if (!conn || conn.state !== HubConnectionState.Disconnected) return;

    try {
      await conn.start();
      if (this.connection !== conn) return;
      console.log('SignalR restarted');
      await this.handleBackOnline();
    } catch (e) {
      if (this.connection !== conn) return;
      console.error('SignalR restart failed, retrying:', e);
      this.scheduleRestart(RESTART_INTERVAL_MS);
    }
  }

  // Phones pause background tabs; reconnect right away when the player comes back or regains network.
  private attachPageListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return;
    this.listenersAttached = true;

    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      if (this.connection?.state === HubConnectionState.Disconnected) {
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = null;
        }
        void this.restartNow();
      }
    };

    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);
  }

  public async joinGameGroup(sessionId: string) {
    if (!this.connection || !this.isConnected) {
      console.error('Cannot join group: connection not ready');
      return;
    }

    try {
      await this.connection.invoke('JoinGameGroup', sessionId);
      console.log('Joined SignalR group for session: ' + sessionId);
    } catch (e) {
      console.error('Failed to join game group:', e);
    }
  }

  public disconnect() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.connection) {
      const oldConn = this.connection;
      this.connection = null;
      this.isConnected = false;
      this.connectionPromise = null;
      oldConn.stop().catch(() => {});
    }
    this.setStatus('idle');
  }

  public onReconnected(callback: () => void): () => void {
    this.reconnectedCallbacks.add(callback);
    return () => {
      this.reconnectedCallbacks.delete(callback);
    };
  }

  // Event Listeners
  public onPlayerJoined(callback: (participant: any) => void) {
    this.connection?.off('PlayerJoined');
    this.connection?.on('PlayerJoined', callback);
  }

  public onQuestionStarted(callback: (question: any, timeLimit: number) => void) {
    this.connection?.off('QuestionStarted');
    this.connection?.on('QuestionStarted', callback);
  }

  public onTimerTick(callback: (data: { remainingSeconds: number }) => void) {
    this.connection?.off('TimerTick');
    this.connection?.on('TimerTick', callback);
  }

  public onTimerPaused(callback: (data: { remainingSeconds: number }) => void) {
    this.connection?.off('TimerPaused');
    this.connection?.on('TimerPaused', callback);
  }

  public onTimerResumed(callback: (data: { remainingSeconds: number }) => void) {
    this.connection?.off('TimerResumed');
    this.connection?.on('TimerResumed', callback);
  }

  public onQuestionFinished(callback: () => void) {
    this.connection?.off('QuestionFinished');
    this.connection?.on('QuestionFinished', callback);
  }

  public onAnswerSubmitted(callback: (data: any) => void) {
    this.connection?.off('AnswerSubmitted');
    this.connection?.on('AnswerSubmitted', callback);
  }

  public onLeaderboardUpdated(callback: (data: any) => void) {
    this.connection?.off('LeaderboardUpdated');
    this.connection?.on('LeaderboardUpdated', callback);
  }

  public onShowQuestionResults(callback: (data: any) => void) {
    this.connection?.off('ShowQuestionResults');
    this.connection?.on('ShowQuestionResults', callback);
  }

  public onManualReviewRequired(callback: () => void) {
    this.connection?.off('ManualReviewRequired');
    this.connection?.on('ManualReviewRequired', callback);
  }

  public onGameResumed(callback: () => void) {
    this.connection?.off('GameResumed');
    this.connection?.on('GameResumed', callback);
  }

  public onImageHidden(callback: () => void) {
    this.connection?.off('ImageHidden');
    this.connection?.on('ImageHidden', callback);
  }

  public onGameEnded(callback: (finalLeaderboard: any) => void) {
    this.connection?.off('GameEnded');
    this.connection?.on('GameEnded', callback);
  }
}

export const gameHubService = new GameHubService();
