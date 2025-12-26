import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Login from './components/Login';
import Board from './components/Board';
import Leaderboard from './components/Leaderboard';
import { Player, MovePayload } from './types';

const getBackendUrl = () => {
  // Hardcoded for reliability during debugging - the Env Var appears truncated in production
  const productionUrl = 'https://connect4-backend-1o4i.onrender.com';
  
  if (import.meta.env.VITE_BACKEND_URL) {
      console.log('Env Var:', import.meta.env.VITE_BACKEND_URL);
  }
  
  // Use localhost if in development mode (checked via standard Vite env)
  if (import.meta.env.DEV) {
      return 'http://localhost:3001';
  }
  
  return productionUrl;
};

const SOCKET_URL = getBackendUrl();

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [view, setView] = useState<'login' | 'queue' | 'game'>('login');
  const [username, setUsername] = useState<string>('');
  const [gameId, setGameId] = useState<string | null>(null);
  const [board, setBoard] = useState<number[][]>(Array(6).fill(Array(7).fill(0)));
  const [turn, setTurn] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isDraw, setIsDraw] = useState<boolean>(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server', newSocket.id);
      setMyId(newSocket.id || null);
      
      // Attempt reconnect if we have stored session
      const storedUser = localStorage.getItem('username');
      const storedGameId = localStorage.getItem('gameId');
      if (storedUser && storedGameId) {
          newSocket.emit('reconnect_game', { username: storedUser, gameId: storedGameId });
      }
    });
    
    newSocket.on('reconnect_success', (data: { gameId: string, board: number[][], turn: string }) => {
        const storedUser = localStorage.getItem('username');
        if (storedUser) setUserInfo(storedUser);
        
        setGameId(data.gameId);
        setBoard(data.board);
        setTurn(data.turn);
        setView('game');
        setStatusMsg('Reconnected to game!');
    });

    newSocket.on('queue_joined', (data: { message: string }) => {
      setView('queue');
      setStatusMsg(data.message);
    });

    newSocket.on('game_start', (data: { gameId: string, players: Player[], turn: string }) => {
      setGameId(data.gameId);
      setPlayers(data.players); 
      setTurn(data.turn);
      setBoard(Array(6).fill(Array(7).fill(0))); 
      setWinner(null);
      setIsDraw(false);
      setView('game');
      setStatusMsg('Game Started!');
      
      localStorage.setItem('gameId', data.gameId);
    });

    newSocket.on('move_made', (data: MovePayload) => {
      setBoard(data.board);
      setTurn(data.nextTurn);
      if (data.winner) {
          setWinner(data.winner);
          setStatusMsg(`Winner: ${data.winner}`);
          localStorage.removeItem('gameId'); 
      } else if (data.isDraw) {
          setIsDraw(true);
          setStatusMsg("It's a Draw!");
          localStorage.removeItem('gameId');
      } else {
        const nextPlayer = data.nextTurn === newSocket.id ? 'Your' : "Opponent's";
        setStatusMsg(`${nextPlayer} turn`);
      }
    });

    newSocket.on('opponent_disconnected', (data: { username: string }) => {
        setStatusMsg(`${data.username} disconnected. Waiting for reconnection...`);
    });
    
    newSocket.on('opponent_reconnected', (data: { username: string }) => {
        setStatusMsg(`${data.username} reconnected!`);
    });
    
    newSocket.on('error', (data: { message: string }) => {
        alert(data.message);
    });

    return () => { newSocket.close(); };
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const setUserInfo = (user: string) => {
      setUsername(user);
      localStorage.setItem('username', user);
  };

  const handleJoin = (user: string) => {
    setUserInfo(user);
    if (socket) {
      socket.emit('join_queue', user);
    }
  };

  const handleMove = (colIndex: number) => {
      if (socket) {
          socket.emit('make_move', { column: colIndex });
      }
  };
  
  const reset = () => {
      setView('login');
      setBoard(Array(6).fill(Array(7).fill(0)));
      setWinner(null);
      localStorage.removeItem('gameId');
  };

  return (
    <div className="container">
      <h1>4 in a Row</h1>
      
      {view === 'login' && (
        <>
            <Login onJoin={handleJoin} />
            <Leaderboard />
        </>
      )}

      {view === 'queue' && (
        <div className="status">
            <p>{statusMsg}</p>
            <div className="loader">Searching...</div>
        </div>
      )}

      {view === 'game' && (
        <div>
          <div className="status">
             <p>Players: {players[0]?.username} vs {players[1]?.username}</p>
             <h3>{statusMsg}</h3>
             {winner || isDraw ? (
                 <button onClick={reset}>Play Again</button>
             ) : (
                 <p>{turn === myId ? "Your Turn (Color matches your join order)" : "Opponent's Turn"}</p>
             )}
          </div>
          <Board 
             board={board} 
             onMove={handleMove} 
             myTurn={turn === myId} 
             winner={winner}
          />
        </div>
      )}
    </div>
  );
}

export default App;
