import { v4 as uuidv4 } from 'uuid';
import Bot from './bot';
import { saveGame, updateWin } from './db';
import { sendGameEndEvent } from './kafka';
import { Server } from 'socket.io';
import { Player, GameData } from './types';

/**
 * Manages the state of a single 4-in-a-row game.
 * Handles move validation, win detection, and state broadcasting.
 */
export default class Game {
  id: string;
  players: Player[];
  io: Server;
  board: number[][];
  turn: number;
  winner: Player | null; 
  isDraw: boolean;
  active: boolean;
  startTime: number;

  constructor(player1: Player, player2: Player, io: Server) {
    this.id = uuidv4();
    this.players = [player1, player2];
    this.io = io;
    this.board = Array(6).fill(null).map(() => Array(7).fill(0)); // 6 rows, 7 cols
    this.turn = 0; // Index of player whose turn it is
    this.winner = null;
    this.isDraw = false;
    this.active = true;
    this.startTime = Date.now();
    
    // Notify players game started
    this.broadcast('game_start', {
      gameId: this.id,
      players: this.players.map(p => ({ username: p.username, id: p.socketId })),
      turn: this.players[this.turn].socketId
    });

    // Handle case where first player is a bot
    if (this.players[this.turn].isBot) {
        this.makeBotMove();
    }
  }

  /**
   * Sends an event to all human players in the game.
   */
  broadcast(event: string, data: any) {
    this.players.forEach(p => {
      if (!p.isBot && p.socketId) {
        this.io.to(p.socketId).emit(event, data);
      }
    });
  }

  /**
   * Attempts to make a move for a player.
   * Returns true if valid and processed, false otherwise.
   */
  makeMove(playerId: string, column: number): boolean {
    if (!this.active || this.winner) return false;
    
    const playerIndex = this.players.findIndex(p => p.socketId === playerId);
    if (playerIndex !== this.turn) return false;

    // Find first available row from bottom
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (this.board[r][column] === 0) {
        row = r;
        break;
      }
    }

    if (row === -1) return false; // Column is full

    // Update board state
    this.board[row][column] = playerIndex + 1; // 1 for P1, 2 for P2

    // Check game end conditions
    if (this.checkWin(row, column, playerIndex + 1)) {
      this.winner = this.players[playerIndex];
      this.active = false;
    } else if (this.checkDraw()) {
      this.isDraw = true;
      this.active = false;
    }

    // Broadcast move update
    this.broadcast('move_made', {
      column,
      row,
      player: playerId,
      board: this.board,
      nextTurn: this.active ? this.players[(this.turn + 1) % 2].socketId : null,
      winner: this.winner ? this.winner.username : null,
      isDraw: this.isDraw
    });

    if (!this.active) {
        this.finishGame();
        return true;
    }

    // Switch turn
    this.turn = (this.turn + 1) % 2;

    // Trigger bot if it's their turn
    if (this.players[this.turn].isBot) {
        // Small delay to make it feel natural
        setTimeout(() => this.makeBotMove(), 500); 
    }

    return true;
  }

  /**
   * Handles end of game logic: persistence, analytics, and stats.
   */
  private finishGame() {
        const gameData: GameData = {
            id: this.id,
            player1: this.players[0].username,
            player2: this.players[1].username,
            winner: this.winner ? this.winner.username : 'draw',
            reason: this.isDraw ? 'draw' : 'global_win'
        };
        
        saveGame(gameData);
        sendGameEndEvent(gameData);
        
        if (this.winner && !this.winner.isBot) {
            updateWin(this.winner.username);
        }
  }

  makeBotMove() {
      if (!this.active) return;
      const botPlayer = this.players[this.turn];
      const botLogic = new Bot(this.board, this.turn + 1);
      const column = botLogic.getBestMove();
      
      this.makeMove(botPlayer.socketId, column);
  }

  checkWin(r: number, c: number, player: number): boolean {
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diagonal /
      [1, -1] // Diagonal \
    ];

    for (let [dr, dc] of directions) {
      let count = 1;
      
      // Check forward direction
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || this.board[nr][nc] !== player) break;
        count++;
      }
      
      // Check backward direction
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || this.board[nr][nc] !== player) break;
        count++;
      }

      if (count >= 4) return true;
    }
    return false;
  }

  checkDraw(): boolean {
    return this.board.every(row => row.every(cell => cell !== 0));
  }
  
  handleDisconnect(socketId: string) {
      const playerIndex = this.players.findIndex(p => p.socketId === socketId);
      if (playerIndex === -1) return;
      
      this.broadcast('opponent_disconnected', { username: this.players[playerIndex].username });
      
      this.players[playerIndex].disconnected = true;
      this.players[playerIndex].disconnectTime = Date.now();
  }
  
  forfeit(disconnectedUsername: string) {
      if (!this.active) return;
      
      const winner = this.players.find(p => p.username !== disconnectedUsername);
      if (winner) {
          this.winner = winner;
          this.active = false;
          this.broadcast('game_over', { winner: winner.username, reason: 'opponent_forfeit' });
          this.finishGame();
      }
  }

  reconnect(username: string, socketId: string): boolean {
       const playerIndex = this.players.findIndex(p => p.username === username && p.disconnected);
       if (playerIndex !== -1) {
           this.players[playerIndex].socketId = socketId;
           this.players[playerIndex].disconnected = false;
           this.io.to(socketId).emit('reconnect_success', {
               gameId: this.id,
               board: this.board,
               turn: this.players[this.turn].socketId
           });
           this.broadcast('opponent_reconnected', { username });
           return true;
       }
       return false;
  }
}
