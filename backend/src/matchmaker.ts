import Game from './game';
import { Server, Socket } from 'socket.io';
import { Player, MoveData, ReconnectData } from './types';

interface QueueItem {
    socket: Socket;
    username: string;
    timeoutId: NodeJS.Timeout;
}

export default class Matchmaker {
  io: Server;
  queue: QueueItem[];
  games: Map<string, Game>;
  socketToGame: Map<string, string>;

  constructor(io: Server) {
    this.io = io;
    this.queue = [];
    this.games = new Map();
    this.socketToGame = new Map();
  }

  addPlayer(socket: Socket, username: string) {
    console.log(`Adding player ${username} (${socket.id}) to queue`);
    
    // Avoid double queueing
    if (this.socketToGame.has(socket.id)) return;

    if (this.queue.length > 0) {
      // Match found immediately
      const opponent = this.queue.shift();
      
      if (opponent) {
        clearTimeout(opponent.timeoutId);
        this.startGame(opponent, { socket, username });
      }
    } else {
      // No match, enqueue and start bot timer
      const timeoutId = setTimeout(() => {
        this.matchWithBot(socket.id);
      }, 10000);

      this.queue.push({ socket, username, timeoutId });
      socket.emit('queue_joined', { message: 'Waiting for opponent...' });
    }
  }

  startGame(p1: { socket: Socket, username: string, isBot?: boolean }, 
            p2: { socket: Socket, username: string, isBot?: boolean }) {
    
    // Sanity check connectivity for human players
    if (!p1.isBot && !p1.socket.connected) {
        if (!p2.isBot) this.addPlayer(p2.socket, p2.username);
        return;
    }

    const player1: Player = {
      socketId: p1.isBot ? 'BOT' : p1.socket.id,
      username: p1.username,
      isBot: p1.isBot || false,
      disconnected: false
    };

    const player2: Player = {
      socketId: p2.isBot ? 'BOT' : p2.socket.id,
      username: p2.username,
      isBot: p2.isBot || false,
      disconnected: false
    };

    const game = new Game(player1, player2, this.io);
    this.games.set(game.id, game);

    // Map sockets to game
    if (!p1.isBot) {
        this.socketToGame.set(p1.socket.id, game.id);
        p1.socket.join(game.id);
    }
    if (!p2.isBot) {
        this.socketToGame.set(p2.socket.id, game.id);
        p2.socket.join(game.id);
    }
    
    console.log(`Game started: ${game.id} - ${player1.username} vs ${player2.username}`);
  }

  matchWithBot(socketId: string) {
    const index = this.queue.findIndex(p => p.socket.id === socketId);
    if (index === -1) return; // Player already left or matched

    const p1 = this.queue.splice(index, 1)[0];
    
    // Create a virtual bot player
    this.startGame(p1, { 
        socket: {} as Socket, // Mock socket for bot
        username: 'Bot', 
        isBot: true 
    });
  }

  handleMove(socket: Socket, data: MoveData) {
    const gameId = this.socketToGame.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (game) {
      game.makeMove(socket.id, data.column);
    }
  }

  handleDisconnect(socket: Socket) {
    // 1. Remove from queue if waiting
    const qIndex = this.queue.findIndex(p => p.socket.id === socket.id);
    if (qIndex !== -1) {
      const p = this.queue.splice(qIndex, 1)[0];
      clearTimeout(p.timeoutId);
      console.log(`Player ${p.username} removed from queue`);
      return;
    }

    // 2. Notify game if active
    const gameId = this.socketToGame.get(socket.id);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        game.handleDisconnect(socket.id);
        
        // Setup forfeiture check after 30s
        setTimeout(() => {
            const currentGame = this.games.get(gameId);
            if (currentGame && currentGame.active) {
                const player = currentGame.players.find(p => p.username === this.queue.find(q => q.socket.id === socket.id)?.username) || currentGame.players.find(p => p.disconnected && p.socketId === socket.id);
                
                if (player && player.disconnected) {
                    console.log(`Forfeiting game ${gameId} due to timeout for ${player.username}`);
                    currentGame.forfeit(player.username);
                    this.games.delete(gameId);
                    this.socketToGame.delete(socket.id); 
                }
            }
        }, 30000);
      }
    }
  }
  
  handleReconnect(socket: Socket, { username, gameId }: ReconnectData) {
    const game = this.games.get(gameId);
    if (game) {
        const success = game.reconnect(username, socket.id);
        if (success) {
            this.socketToGame.set(socket.id, gameId);
            socket.join(gameId);
            console.log(`Player ${username} reconnected to ${gameId}`);
        } else {
            socket.emit('error', { message: 'Could not reconnect to game' });
        }
    } else {
        socket.emit('error', { message: 'Game not found' });
    }
  }
}
