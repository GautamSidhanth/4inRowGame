import React, { useState } from 'react';

interface LoginProps {
  onJoin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onJoin(username);
    }
  };

  return (
    <div className="login-form">
      <h2>Enter Username</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button type="submit">Join Game</button>
      </form>
    </div>
  );
}

export default Login;
