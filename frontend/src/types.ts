export interface Player {
    username: string;
    id: string; 
}

export interface GameState {
    gameId: string;
    players: Player[];
    turn: string; // socketId
    board: number[][];
    winner: string | null;
    isDraw: boolean;
}

export interface MovePayload {
    column: number;
    row: number;
    player: string; // socketId
    board: number[][];
    nextTurn: string;
    winner: string | null;
    isDraw: boolean;
}
