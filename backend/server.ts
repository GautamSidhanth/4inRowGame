import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import Matchmaker from './src/matchmaker';
import { setupKafka } from './src/kafka';
import { getLeaderboard } from './src/db';
import { MoveData, ReconnectData } from './src/types';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Backend is running!');
});

app.get('/leaderboard', async (req: Request, res: Response) => {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const matchmaker = new Matchmaker(io);

// Initialize Kafka
setupKafka().catch(console.error);

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_queue', (username: string) => {
    if (typeof username === 'string' && username.trim().length > 0) {
        matchmaker.addPlayer(socket, username.trim());
    }
  });

  socket.on('make_move', (data: MoveData) => {
    if (data && typeof data.column === 'number') {
        matchmaker.handleMove(socket, data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    matchmaker.handleDisconnect(socket);
  });
  
  // Reconnection logic
  socket.on('reconnect_game', (data: ReconnectData) => {
      if (data && data.username && data.gameId) {
          matchmaker.handleReconnect(socket, data);
      }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
