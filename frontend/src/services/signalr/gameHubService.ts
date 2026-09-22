import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

class GameHubService {
  private connection: HubConnection | null = null;
  private isConnected = false;

  public async connect(token: string) {
    if (this.isConnected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_SIGNALR_HUB_URL || 'https://localhost:7001/gamehub', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    try {
      await this.connection.start();
      this.isConnected = true;
      console.log('SignalR Connected!');
    } catch (e) {
      console.error('SignalR Connection Error: ', e);
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
}

export const gameHubService = new GameHubService();
