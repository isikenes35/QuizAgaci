import { HubConnection, HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

class GameHubService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectedCallbacks: Set<() => void> = new Set();

  public async connect(token: string, sessionId?: string) {
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
      .withAutomaticReconnect([0, 1000, 2000, 4000, 8000])
      .build();

    this.connection = conn;

    conn.onreconnecting(() => {
      if (this.connection !== conn) return;
      console.log('SignalR reconnecting...');
      this.isConnected = false;
    });

    conn.onreconnected(async (connectionId) => {
      if (this.connection !== conn) return;
      console.log('SignalR reconnected:', connectionId);
      this.isConnected = true;
      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
      this.reconnectedCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Error in onReconnected callback:', err);
        }
      });
    });

    conn.onclose(() => {
      if (this.connection !== conn) return;
      console.log('SignalR disconnected');
      this.isConnected = false;
      this.connectionPromise = null;
    });

    try {
      await conn.start();
      if (this.connection !== conn) return;
      this.isConnected = true;
      console.log('SignalR Connected!');

      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
    } catch (e) {
      if (this.connection === conn) {
        console.error('SignalR Connection Error: ', e);
        this.connectionPromise = null;
      }
    }
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
    if (this.connection) {
      const oldConn = this.connection;
      this.connection = null;
      this.isConnected = false;
      this.connectionPromise = null;
      oldConn.stop().catch(() => {});
    }
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
