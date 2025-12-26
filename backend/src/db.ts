import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/connect4',
});

// Init DB
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                username VARCHAR(255) PRIMARY KEY,
                wins INT DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS games (
                id UUID PRIMARY KEY,
                player1 VARCHAR(255),
                player2 VARCHAR(255),
                winner VARCHAR(255),
                ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database tables initialized");
    } catch (err: any) {
        console.warn("Database initialization failed (is Postgres running?):", err.message);
    }
};

initDb();

export const updateWin = async (username: string) => {
    try {
        await pool.query(`
            INSERT INTO users (username, wins) VALUES ($1, 1)
            ON CONFLICT (username) DO UPDATE SET wins = users.wins + 1
        `, [username]);
    } catch (err) {
        console.error("Error updating win:", err);
    }
};

export const saveGame = async (gameObj: { id: string, player1: string, player2: string, winner: string }) => {
    // gameObj: { id, player1, player2, winner }
    try {
        await pool.query(`
            INSERT INTO games (id, player1, player2, winner) VALUES ($1, $2, $3, $4)
        `, [gameObj.id, gameObj.player1, gameObj.player2, gameObj.winner]);
    } catch (err) {
        console.error("Error saving game:", err);
    }
};

export const getLeaderboard = async () => {
    try {
        const res = await pool.query(`SELECT username, wins FROM users ORDER BY wins DESC LIMIT 10`);
        return res.rows;
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        return [];
    }
};
