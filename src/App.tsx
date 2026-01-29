import { useState, useEffect } from 'react';
import type { LevelData } from './engine/types';
import { generateLevel } from './engine/generate';
import { getMirrorCountForSize } from './engine/mirrorCount';
import InteractiveLevelCard from './components/InteractiveLevelCard';

function App() {
  const [levels, setLevels] = useState<LevelData[]>([]);

  const initLevels = () => {
    try {
      const sizes = [2, 3, 4, 5, 6, 7, 8, 9];
      const newLevels = sizes.map(size => {
        const mirrorCount = getMirrorCountForSize(size);
        return generateLevel(size, mirrorCount);
      });
      setLevels(newLevels);
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
    const mirrorCount = getMirrorCountForSize(size);
    
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
          ✨ Laser Mirrors Puzzle ✨
        </h1>
        <p style={{ 
          color: '#81C784', 
          fontSize: '18px',
          fontWeight: 400,
          margin: 0
        }}>
          Click cells to place mirrors: empty → \ → / → empty
        </p>
      </header>

      <main style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '30px' 
      }}>
        {levels.map((level, i) => (
          <InteractiveLevelCard 
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
        <p style={{ margin: '4px 0' }}>Place mirrors to match the numbers. Red numbers show your current result.</p>
        <p style={{ margin: '4px 0' }}>When all red numbers disappear, you've solved it! 🎉</p>
      </footer>
    </div>
  );
}

export default App;
