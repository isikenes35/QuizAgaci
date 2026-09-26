import { HubConnection, HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';

class GameHubService {
  private connection: HubConnection | null = null;
  private isConnected = false;

  public async connect(token: string, sessionId?: string) {
    if (this.connection && (this.connection.state === 'Connected' || this.connection.state === 'Connecting')) {
      return;
    }

    // Stop if there is any connecting/disconnecting state running
    if (this.connection) {
       await this.connection.stop();
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
    }
  }

  public async joinGameGroup(sessionId: string) {
    if (!this.connection) {
      console.error('Connection not initialized');
      return;
    }

    if (!this.isConnected) {
      console.warn('Connection not ready, waiting...');
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      });
    }

    if (this.isConnected) {
      try {
        await this.connection.invoke('JoinGameGroup', sessionId);
        console.log(`Joined SignalR group for session: ${sessionId}`);
      } catch (e) {
        console.error('Failed to join game group:', e);
      }
    } else {
      console.error('Failed to connect within timeout');
    }
  }

  public disconnect() {
    if (this.connection) {
      this.connection.stop();
      this.isConnected = false;
      this.connection = null;
    }
  }

  // Example Event Listener setup
  public onPlayerJoined(callback: (participant: any) => void) {
    this.connection?.on('PlayerJoined', callback);
  }

  public onQuestionStarted(callback: (question: any, timeLimit: number) => void) {
    this.connection?.on('QuestionStarted', callback);
  }

  public onTimerTick(callback: (data: { remainingSeconds: number }) => void) {
    this.connection?.on('TimerTick', callback);
  }

  public onQuestionFinished(callback: () => void) {
    this.connection?.on('QuestionFinished', callback);
  }

  public onAnswerSubmitted(callback: (data: any) => void) {
    this.connection?.on('AnswerSubmitted', callback);
  }

  public onLeaderboardUpdated(callback: (data: any) => void) {
    this.connection?.on('LeaderboardUpdated', callback);
  }

  public onShowQuestionResults(callback: (data: any) => void) {
    this.connection?.on('ShowQuestionResults', callback);
  }

  public onManualReviewRequired(callback: () => void) {
    this.connection?.on('ManualReviewRequired', callback);
  }

  public onGameResumed(callback: () => void) {
    this.connection?.on('GameResumed', callback);
  }

  public onImageHidden(callback: () => void) {
    this.connection?.on('ImageHidden', callback);
  }
}

export const gameHubService = new GameHubService();
