import { HubConnection, HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

class GameHubService {
  private connection: HubConnection | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

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
       try { await this.connection.stop(); } catch(e){}
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5294/gamehub', {
        accessTokenFactory: () => token,
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this.isConnected = false;
    });

    this.connection.onreconnected(async (connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.isConnected = true;
      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
    });

    this.connection.onclose(() => {
      console.log('SignalR disconnected');
      this.isConnected = false;
      this.connectionPromise = null;
    });

    try {
      await this.connection.start();
      this.isConnected = true;
      console.log('SignalR Connected!');
      
      if (sessionId) {
        await this.joinGameGroup(sessionId);
      }
    } catch (e) {
      console.error('SignalR Connection Error: ', e);
      this.connectionPromise = null;
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
      this.connection.stop();
      this.isConnected = false;
      this.connection = null;
      this.connectionPromise = null;
    }
  }

  // Example Event Listener setup
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
