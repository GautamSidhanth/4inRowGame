export interface Player {
    socketId: string;
    username: string;
    isBot: boolean;
    disconnected?: boolean;
    disconnectTime?: number;
}

export interface GameData {
    id: string;
    player1: string;
    player2: string;
    winner: string;
    reason: 'global_win' | 'draw' | 'forfeit';
}

export interface MoveData {
    column: number;
}

export interface ReconnectData {
    username: string;
    gameId: string;
}
