import React, { useEffect, useState } from 'react';

interface User {
  username: string;
  wins: number;
}

const Leaderboard: React.FC = () => {
  const [data, setData] = useState<User[]>([]);

  useEffect(() => {
    const getBackendUrl = () => {
      const url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      return url.startsWith('http') ? url : `https://${url}`;
    };
    const BACKEND_URL = getBackendUrl();
    fetch(`${BACKEND_URL}/leaderboard`)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(console.error);
  }, []);

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, i) => (
              <tr key={i}>
                  <td>{user.username}</td>
                  <td>{user.wins}</td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
