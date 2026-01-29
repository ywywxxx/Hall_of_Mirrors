import { useState, useEffect } from 'react';
import type { LevelData } from './engine/types';
import { generateLevel } from './engine/generate';
import { getMirrorCountForSize } from './engine/mirrorCount';
import InteractiveLevelCard from './components/InteractiveLevelCard';

type ViewMode = 'menu' | 'game';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [level, setLevel] = useState<LevelData | null>(null);

  const availableSizes = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const handleSizeSelect = (size: number) => {
    setSelectedSize(size);
    try {
      const mirrorCount = getMirrorCountForSize(size);
      const newLevel = generateLevel(size, mirrorCount);
      setLevel(newLevel);
      setViewMode('game');
    } catch (error) {
      console.error("Failed to generate level:", error);
    }
  };

  const handleBackToMenu = () => {
    setViewMode('menu');
    setSelectedSize(null);
    setLevel(null);
  };

  const handleRegenerate = () => {
    if (selectedSize === null) return;
    try {
      const mirrorCount = getMirrorCountForSize(selectedSize);
      const newLevel = generateLevel(selectedSize, mirrorCount);
      setLevel(newLevel);
    } catch (error) {
      console.error("Failed to regenerate level:", error);
    }
  };

  // 主菜单界面
  if (viewMode === 'menu') {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F5E9 30%, #F3E5F5 60%, #E3F2FD 100%)',
        color: '#5A5A5A',
        padding: '30px 20px',
        fontFamily: "'Kalam', cursive",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <header style={{ marginBottom: '60px', textAlign: 'center' }}>
          <h1 style={{ 
            margin: 0, 
            color: '#9C27B0',
            fontSize: '48px',
            fontWeight: 700,
            textShadow: '2px 2px 4px rgba(156, 39, 176, 0.2)',
            marginBottom: '12px'
          }}>
            ✨ Laser Mirrors Puzzle ✨
          </h1>
          <p style={{ 
            color: '#81C784', 
            fontSize: '20px',
            fontWeight: 400,
            margin: 0
          }}>
            Choose your difficulty level
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '20px',
          maxWidth: '800px',
          width: '100%',
          padding: '0 20px'
        }}>
          {availableSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeSelect(size)}
              style={{
                backgroundColor: '#B3D9FF',
                color: '#FFFFFF',
                border: 'none',
                padding: '30px 20px',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: "'Kalam', cursive",
                transition: 'all 0.3s',
                boxShadow: '0 4px 8px rgba(179, 217, 255, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#90CAF9';
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(179, 217, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#B3D9FF';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(179, 217, 255, 0.4)';
              }}
            >
              <span style={{ fontSize: '32px' }}>{size}×{size}</span>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>
                {size <= 3 ? 'Easy' : size <= 5 ? 'Medium' : size <= 8 ? 'Hard' : 'Expert'}
              </span>
            </button>
          ))}
        </div>

        <footer style={{ 
          marginTop: '60px', 
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

  // 游戏界面
  if (viewMode === 'game' && level) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F5E9 30%, #F3E5F5 60%, #E3F2FD 100%)',
        color: '#5A5A5A',
        padding: '30px 20px',
        fontFamily: "'Kalam', cursive"
      }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
            <button
              onClick={handleBackToMenu}
              style={{
                backgroundColor: '#FFC107',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: "'Kalam', cursive",
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(255, 193, 7, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FF9800';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFC107';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(255, 193, 7, 0.4)';
              }}
            >
              ← Back to Menu
            </button>
            <h1 style={{ 
              margin: 0, 
              color: '#9C27B0',
              fontSize: '42px',
              fontWeight: 700,
              textShadow: '2px 2px 4px rgba(156, 39, 176, 0.2)'
            }}>
              ✨ Laser Mirrors Puzzle ✨
            </h1>
          </div>
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
          justifyContent: 'center', 
          alignItems: 'flex-start'
        }}>
          <InteractiveLevelCard 
            level={level} 
            onRegenerate={handleRegenerate} 
          />
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
      ✨ Loading...
    </div>
  );
}

export default App;
