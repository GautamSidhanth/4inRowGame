import React from 'react';

interface BoardProps {
  board: number[][];
  onMove: (colIndex: number) => void;
  myTurn: boolean;
  winner: any;
}

const Board: React.FC<BoardProps> = ({ board, onMove, myTurn, winner }) => {
  
  const handleColumnClick = (colIndex: number) => {
    if (myTurn && !winner) {
      onMove(colIndex);
    }
  };

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        row.map((cell, colIndex) => (
          <div 
            key={`${rowIndex}-${colIndex}`} 
            className={`cell ${cell === 1 ? 'player-1' : cell === 2 ? 'player-2' : ''}`}
            onClick={() => handleColumnClick(colIndex)}
          />
        ))
      ))}
    </div>
  );
}

export default Board;
