import { useState, useEffect } from 'react';
import type { LevelData } from './engine/types';
import { generateLevel } from './engine/generate';
import LevelCard from './components/LevelCard';

function App() {
  const [levels, setLevels] = useState<LevelData[]>([]);

  const initLevels = () => {
    try {
      setLevels([
        generateLevel(2, 1),
        generateLevel(4, 3),
        generateLevel(5, 5),
      ]);
    } catch (error) {
      console.error("Failed to initialize levels:", error);
    }
  };

  useEffect(() => {
    initLevels();
  }, []);

  const handleRegenerate = (index: number) => {
    const newLevels = [...levels];
    const size = newLevels[index].size;
    let mirrorCount = 1;
    if (size === 4) mirrorCount = 3;
    if (size === 5) mirrorCount = 5;
    
    try {
      newLevels[index] = generateLevel(size, mirrorCount);
      setLevels(newLevels);
    } catch (error) {
      console.error("Failed to regenerate level:", error);
    }
  };

  if (levels.length === 0) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F5E9 100%)',
        color: '#9C27B0', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: "'Kalam', cursive",
        fontSize: '20px',
        fontWeight: 700
      }}>
        ✨ Loading levels...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F5E9 30%, #F3E5F5 60%, #E3F2FD 100%)',
      color: '#5A5A5A',
      padding: '30px 20px',
      fontFamily: "'Kalam', cursive"
    }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ 
          margin: 0, 
          color: '#9C27B0',
          fontSize: '42px',
          fontWeight: 700,
          textShadow: '2px 2px 4px rgba(156, 39, 176, 0.2)',
          marginBottom: '8px'
        }}>
          ✨ Laser Mirrors Level Generator ✨
        </h1>
        <p style={{ 
          color: '#81C784', 
          fontSize: '18px',
          fontWeight: 400,
          margin: 0
        }}>
          Generated levels for 2x2, 4x4, and 5x5 grids
        </p>
      </header>

      <main style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '30px' 
      }}>
        {levels.map((level, i) => (
          <LevelCard 
            key={`${level.size}-${i}`} 
            level={level} 
            onRegenerate={() => handleRegenerate(i)} 
          />
        ))}
      </main>
      
      <footer style={{ 
        marginTop: '50px', 
        color: '#81C784', 
        fontSize: '15px',
        textAlign: 'center',
        fontWeight: 400
      }}>
        <p style={{ margin: '4px 0' }}>✨ Reflect light through mirrors and count the steps until it exits ✨</p>
        <p style={{ margin: '4px 0' }}>∞ indicates a loop (rare for boundary-entry rays)</p>
      </footer>
    </div>
  );
}

export default App;
