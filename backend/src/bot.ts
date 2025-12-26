/**
 * A Minimax-based bot for 4-in-a-row.
 * Uses Alpha-Beta pruning to decide the best move within a given depth.
 */
export default class Bot {
    board: number[][];
    player: number;
    opponent: number;
    rows: number;
    cols: number;

    constructor(board: number[][], playerValue: number) {
      this.board = board; // Read-only copy effectively
      this.player = playerValue;
      this.opponent = playerValue === 1 ? 2 : 1;
      this.rows = 6;
      this.cols = 7;
    }
  
    /**
     * Calculates the best column to drop a piece.
     * Prioritizes immediate wins and blocks before running Minimax.
     */
    getBestMove(): number {
      // 1. Check for immediate win
      for (let c = 0; c < this.cols; c++) {
        if (this.canPlay(c, this.board)) {
          const tempBoard = this.copyBoard(this.board);
          this.playMove(c, tempBoard, this.player);
          if (this.checkWin(tempBoard, this.player)) return c;
        }
      }
  
      // 2. Check for immediate block
      for (let c = 0; c < this.cols; c++) {
        if (this.canPlay(c, this.board)) {
          const tempBoard = this.copyBoard(this.board);
          this.playMove(c, tempBoard, this.opponent);
          if (this.checkWin(tempBoard, this.opponent)) return c;
        }
      }
  
      // 3. Minimax
      // Depth 4 is usually good enough for instant reaction in JS
      const { column } = this.minimax(this.board, 4, -Infinity, Infinity, true);
      return column;
    }
  
    minimax(board: number[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): { column: number, score: number } {
      const validMoves = this.getValidMoves(board);
      
      if (depth === 0 || this.isTerminalNode(board)) {
        return { column: -1, score: this.evaluateBoard(board) };
      }
      
      // Default worst case
      let bestCol = validMoves[0] !== undefined ? validMoves[0] : -1;

      if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let col of validMoves) {
          const tempBoard = this.copyBoard(board);
          this.playMove(col, tempBoard, this.player);
          const evalScore = this.minimax(tempBoard, depth - 1, alpha, beta, false).score;
          if (evalScore > maxEval) {
            maxEval = evalScore;
            bestCol = col;
          }
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
        return { column: bestCol, score: maxEval };
      } else {
        let minEval = Infinity;
        for (let col of validMoves) {
          const tempBoard = this.copyBoard(board);
          this.playMove(col, tempBoard, this.opponent);
          const evalScore = this.minimax(tempBoard, depth - 1, alpha, beta, true).score;
          if (evalScore < minEval) {
            minEval = evalScore;
            bestCol = col;
          }
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
        return { column: bestCol, score: minEval };
      }
    }
  
    evaluateBoard(board: number[][]): number {
      let score = 0;
      
      // Center column preference
      const centerArray = [];
      for(let r=0; r<this.rows; r++) centerArray.push(board[r][3]);
      const centerCount = centerArray.filter(x => x === this.player).length;
      score += centerCount * 3;
  
      // Horizontal
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols - 3; c++) {
          const window = board[r].slice(c, c + 4);
          score += this.evaluateWindow(window);
        }
      }
  
      // Vertical
      for (let c = 0; c < this.cols; c++) {
        for (let r = 0; r < this.rows - 3; r++) {
           const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
           score += this.evaluateWindow(window);
        }
      }
  
      // Diagonal /
      for (let r = 0; r < this.rows - 3; r++) {
        for (let c = 0; c < this.cols - 3; c++) {
          const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
          score += this.evaluateWindow(window);
        }
      }
      
      // Diagonal \
      for (let r = 0; r < this.rows - 3; r++) {
         for (let c = 0; c < this.cols - 3; c++) {
            const window = [board[r+3][c], board[r+2][c+1], board[r+1][c+2], board[r][c+3]];
            score += this.evaluateWindow(window);
         }
      }
  
      return score;
    }
  
    evaluateWindow(window: number[]): number {
      let score = 0;
      const playerPiece = this.player;
      const oppPiece = this.opponent;
      const empty = 0;
  
      const playerCount = window.filter(x => x === playerPiece).length;
      const emptyCount = window.filter(x => x === empty).length;
      const oppCount = window.filter(x => x === oppPiece).length;
  
      if (playerCount === 4) score += 100;
      else if (playerCount === 3 && emptyCount === 1) score += 5;
      else if (playerCount === 2 && emptyCount === 2) score += 2;
  
      if (oppCount === 3 && emptyCount === 1) score -= 4;
  
      return score;
    }
  
    canPlay(col: number, board: number[][]): boolean {
      return board[0][col] === 0;
    }
  
    playMove(col: number, board: number[][], player: number): void {
      for (let r = 5; r >= 0; r--) {
        if (board[r][col] === 0) {
          board[r][col] = player;
          break;
        }
      }
    }
  
    getValidMoves(board: number[][]): number[] {
      const moves = [];
      for (let c = 0; c < 7; c++) {
        if (this.canPlay(c, board)) moves.push(c);
      }
      // Reorder to check center first for better pruning?
      // Optional, but good for optimization
      return moves.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
    }
  
    copyBoard(board: number[][]): number[][] {
      return board.map(row => [...row]);
    }
    
    checkWin(board: number[][], player: number): boolean {
         // Simplified check for bot simulation
         // Reuse Game.checkWin logic but adapted for stateless board array
         const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
         for (let r=0; r<6; r++) {
             for (let c=0; c<7; c++) {
                 if (board[r][c] !== player) continue;
                 for (let [dr, dc] of directions) {
                     let count = 1;
                     for (let i=1; i<4; i++) {
                         let nr = r + dr*i;
                         let nc = c + dc*i;
                         if (nr<0 || nr>=6 || nc<0 || nc>=7 || board[nr][nc] !== player) break;
                         count++;
                     }
                     if (count >= 4) return true;
                 }
             }
         }
         return false;
    }
  
    isTerminalNode(board: number[][]): boolean {
      return this.checkWin(board, this.player) || this.checkWin(board, this.opponent) || this.getValidMoves(board).length === 0;
    }
}
