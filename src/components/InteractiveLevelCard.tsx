import React, { useState, useMemo } from 'react';
import type { LevelData, Cell, MirrorType, EntrySide } from '../engine/types';
import { traceRay } from '../engine/trace';
import { calculateClues } from '../engine/calculateClues';

interface InteractiveLevelCardProps {
  level: LevelData; // 答案图
  onRegenerate: () => void;
}

const InteractiveLevelCard: React.FC<InteractiveLevelCardProps> = ({ level, onRegenerate }) => {
  const { size, grid: answerGrid, clues: answerClues } = level;
  
  // 当前图的镜子布局（用户放置的）
  const [currentMirrors, setCurrentMirrors] = useState<Map<string, MirrorType>>(new Map());
  
  // 标记为"无镜子"的格子（灰色叉）
  const [noMirrorMarks, setNoMirrorMarks] = useState<Set<string>>(new Set());
  
  // 当前鼠标悬停的格子
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  
  // 是否显示答案
  const [showAnswer, setShowAnswer] = useState(false);
  
  const cellSize = 50;
  const clueSize = 35;
  const gridPadding = 2;
  const gridWidth = size * cellSize + gridPadding * 2;
  const gridHeight = size * cellSize + gridPadding * 2;

  // 糖果色系
  const candyColors = {
    cardBg: '#FFF9E6',
    cardBorder: '#FFD93D',
    gridBg: '#E8F5E9',
    gridBorder: '#81C784',
    cellBg: '#FFFFFF',
    cellBorder: '#E1BEE7',
    clue: '#9C27B0',
    clueWrong: '#FF0000', // 红色标注
    text: '#5A5A5A',
    button: '#B3D9FF',
    buttonHover: '#90CAF9',
    pathColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'],
  };

  // 构建当前图的grid（没有镜子，只有用户放置的）
  const currentGrid = useMemo(() => {
    const grid: Cell[][] = [];
    for (let r = 0; r < size; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        const mirror = currentMirrors.get(key);
        row.push({ row: r, col: c, mirror });
      }
      grid.push(row);
    }
    return grid;
  }, [size, currentMirrors]);

  // 计算当前图的clues
  const currentClues = useMemo(() => {
    return calculateClues(currentGrid);
  }, [currentGrid]);

  // 计算当前图的光路
  const currentPaths = useMemo(() => {
    const paths: Array<{ entry: { side: EntrySide; index: number }; exit: { side: EntrySide; index: number }; path: Array<{ r: number; c: number }> }> = [];
    const sides: EntrySide[] = ['top', 'bottom', 'left', 'right'];
    
    for (const side of sides) {
      for (let i = 0; i < size; i++) {
        const result = traceRay(currentGrid, { side, index: i });
        if (result.exit && result.path) {
          paths.push({
            entry: { side, index: i },
            exit: result.exit,
            path: result.path
          });
        }
      }
    }
    
    return paths;
  }, [currentGrid, size]);

  // 检查是否通关
  const isSolved = useMemo(() => {
    const sides: EntrySide[] = ['top', 'bottom', 'left', 'right'];
    for (const side of sides) {
      for (let i = 0; i < size; i++) {
        if (currentClues[side][i] !== answerClues[side][i]) {
          return false;
        }
      }
    }
    return true;
  }, [currentClues, answerClues, size]);

  // 处理格子点击
  const handleCellClick = (r: number, c: number) => {
    const key = `${r},${c}`;
    const current = currentMirrors.get(key);
    const newMirrors = new Map(currentMirrors);
    const newNoMirrorMarks = new Set(noMirrorMarks);
    
    // 如果放置了镜子，移除"无镜子"标记
    if (!current) {
      // 没有镜子 -> 放置 \
      newMirrors.set(key, '\\');
      newNoMirrorMarks.delete(key);
    } else if (current === '\\') {
      // \ -> /
      newMirrors.set(key, '/');
      newNoMirrorMarks.delete(key);
    } else {
      // / -> 移除
      newMirrors.delete(key);
    }
    
    setCurrentMirrors(newMirrors);
    setNoMirrorMarks(newNoMirrorMarks);
  };

  // 处理键盘事件（按x键标记/取消标记"无镜子"）
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'x' || e.key === 'X') {
        if (hoveredCell) {
          const key = `${hoveredCell.r},${hoveredCell.c}`;
          const newNoMirrorMarks = new Set(noMirrorMarks);
          
          // 如果格子有镜子，不能标记为"无镜子"
          if (!currentMirrors.has(key)) {
            if (newNoMirrorMarks.has(key)) {
              newNoMirrorMarks.delete(key);
            } else {
              newNoMirrorMarks.add(key);
            }
            setNoMirrorMarks(newNoMirrorMarks);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [hoveredCell, noMirrorMarks, currentMirrors]);

  // 获取单元格中心坐标
  const getCellCenter = (r: number, c: number) => {
    return {
      x: gridPadding + c * cellSize + cellSize / 2,
      y: gridPadding + r * cellSize + cellSize / 2,
    };
  };

  // 获取入口/出口坐标
  const getEntryExitPoint = (side: string, index: number) => {
    switch (side) {
      case 'top':
        return { x: gridPadding + index * cellSize + cellSize / 2, y: 0 };
      case 'bottom':
        return { x: gridPadding + index * cellSize + cellSize / 2, y: gridHeight };
      case 'left':
        return { x: 0, y: gridPadding + index * cellSize + cellSize / 2 };
      case 'right':
        return { x: gridWidth, y: gridPadding + index * cellSize + cellSize / 2 };
      default:
        return { x: 0, y: 0 };
    }
  };

  // 渲染45度角的镜子（仅显示用户放置的）
  const renderMirror = (mirrorType: MirrorType) => {
    // 反转显示
    const displayAsForward = mirrorType === '\\';
    const rotation = displayAsForward ? '45deg' : '-45deg';
    const mirrorColor = '#8B4513'; // 棕色
    
    return (
      <div
        style={{
          width: `${cellSize * 0.7}px`,
          height: '4px',
          backgroundColor: mirrorColor,
          transform: `rotate(${rotation})`,
          transformOrigin: 'center',
          boxShadow: `0 0 3px ${mirrorColor}`,
          borderRadius: '2px',
          zIndex: 10,
        }}
      />
    );
  };

  // 绘制光路路径
  const renderPaths = () => {
    if (!currentPaths || currentPaths.length === 0) return null;

    return (
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        {currentPaths.map((pathData, pathIdx) => {
          const pathColor = candyColors.pathColors[pathIdx % candyColors.pathColors.length];
          
          const entryPoint = getEntryExitPoint(pathData.entry.side, pathData.entry.index);
          const exitPoint = getEntryExitPoint(pathData.exit.side, pathData.exit.index);
          
          const points: Array<{ x: number; y: number }> = [entryPoint];
          
          pathData.path.forEach((p) => {
            const center = getCellCenter(p.r, p.c);
            points.push(center);
          });
          
          points.push(exitPoint);
          
          let pathD = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
          }
          
          return (
            <path
              key={`path-${pathIdx}`}
              d={pathD}
              stroke={pathColor}
              strokeWidth="4"
              fill="none"
              strokeDasharray="8,4"
              opacity="0.8"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ 
      border: `2px solid ${candyColors.cardBorder}`, 
      padding: '24px', 
      margin: '10px', 
      borderRadius: '20px',
      backgroundColor: candyColors.cardBg,
      boxShadow: '0 8px 16px rgba(255, 217, 61, 0.25)',
      color: candyColors.text,
      width: 'fit-content',
      fontFamily: "'Kalam', cursive"
    }}>
      <h3 style={{ 
        marginTop: 0, 
        marginBottom: '16px',
        color: '#9C27B0',
        fontSize: '22px',
        fontWeight: 700
      }}>
        {size}x{size} Level {isSolved && '✅ Solved!'}
      </h3>
      
      <div style={{ 
        display: 'inline-block', 
        position: 'relative',
        userSelect: 'none'
      }}>
        {/* Top Clues - 答案图数字 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
          <div style={{ width: clueSize }}></div>
          {answerClues.top.map((clue: number | string, i: number) => {
            const currentClue = currentClues.top[i];
            const isWrong = currentClue !== clue;
            return (
              <div key={`top-${i}`} style={{ 
                width: cellSize, 
                textAlign: 'center',
                fontSize: '17px',
                fontWeight: 700,
                color: candyColors.clue,
                position: 'relative'
              }}>
                {clue}
                {isWrong && (
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: candyColors.clueWrong,
                    fontSize: '14px',
                    fontWeight: 700
                  }}>
                    {currentClue}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ width: clueSize }}></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Left Clues */}
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: '6px' }}>
            {answerClues.left.map((clue: number | string, i: number) => {
              const currentClue = currentClues.left[i];
              const isWrong = currentClue !== clue;
              return (
                <div key={`left-${i}`} style={{ 
                  height: cellSize, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: clueSize,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: candyColors.clue,
                  position: 'relative'
                }}>
                  {clue}
                  {isWrong && (
                    <div style={{
                      position: 'absolute',
                      left: '-9px',
                      color: candyColors.clueWrong,
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      {currentClue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid with paths */}
          <div style={{ 
            position: 'relative',
            display: 'grid', 
            gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
            border: `3px solid ${candyColors.gridBorder}`,
            backgroundColor: candyColors.gridBg,
            borderRadius: '8px',
            padding: `${gridPadding}px`,
            width: gridWidth,
            height: gridHeight
          }}>
            {renderPaths()}
            {currentGrid.flat().map((cell: Cell, i: number) => {
              const r = Math.floor(i / size);
              const c = i % size;
              const key = `${r},${c}`;
              const hasNoMirrorMark = noMirrorMarks.has(key);
              
              return (
                <div 
                  key={i} 
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={(e) => {
                    setHoveredCell({ r, c });
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                  onMouseLeave={(e) => {
                    setHoveredCell(null);
                    e.currentTarget.style.backgroundColor = candyColors.cellBg;
                  }}
                  style={{ 
                    width: cellSize, 
                    height: cellSize, 
                    border: `1px solid ${candyColors.cellBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: candyColors.cellBg,
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'visible',
                    zIndex: 1,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {cell.mirror && renderMirror(cell.mirror)}
                  {/* 显示答案图中的镜子（半透明） */}
                  {showAnswer && answerGrid[r][c].mirror && (
                    <div style={{
                      position: 'absolute',
                      zIndex: 15,
                      opacity: 0.4
                    }}>
                      {renderMirror(answerGrid[r][c].mirror!)}
                    </div>
                  )}
                  {hasNoMirrorMark && !cell.mirror && (
                    <div style={{
                      fontSize: '36px',
                      color: '#666666',
                      fontWeight: 'bold',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      position: 'absolute',
                      zIndex: 20,
                      lineHeight: 1
                    }}>
                      ×
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Clues */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px' }}>
            {answerClues.right.map((clue: number | string, i: number) => {
              const currentClue = currentClues.right[i];
              const isWrong = currentClue !== clue;
              return (
                <div key={`right-${i}`} style={{ 
                  height: cellSize, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: clueSize,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: candyColors.clue,
                  position: 'relative'
                }}>
                  {clue}
                  {isWrong && (
                    <div style={{
                      position: 'absolute',
                      right: '-9px',
                      color: candyColors.clueWrong,
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      {currentClue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Clues */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
          <div style={{ width: clueSize }}></div>
          {answerClues.bottom.map((clue: number | string, i: number) => {
            const currentClue = currentClues.bottom[i];
            const isWrong = currentClue !== clue;
            return (
              <div key={`bottom-${i}`} style={{ 
                width: cellSize, 
                textAlign: 'center',
                fontSize: '17px',
                fontWeight: 700,
                color: candyColors.clue,
                position: 'relative'
              }}>
                {clue}
                {isWrong && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: candyColors.clueWrong,
                    fontSize: '14px',
                    fontWeight: 700
                  }}>
                    {currentClue}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ width: clueSize }}></div>
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button 
          onClick={onRegenerate}
          style={{
            backgroundColor: candyColors.button,
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: "'Kalam', cursive",
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(179, 217, 255, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = candyColors.buttonHover;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(179, 217, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = candyColors.button;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(179, 217, 255, 0.4)';
          }}
        >
          ✨ New Level
        </button>
        
        <button 
          onClick={() => setShowAnswer(!showAnswer)}
          style={{
            backgroundColor: showAnswer ? '#FF9800' : '#FFC107',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: "'Kalam', cursive",
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(255, 193, 7, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(255, 193, 7, 0.4)';
          }}
        >
          {showAnswer ? '🙈 Hide Answer' : '👁️ Show Answer'}
        </button>
        
        <div style={{
          fontSize: '12px',
          color: candyColors.text,
          textAlign: 'center',
          marginTop: '8px'
        }}>
          💡 Tip: Hover over a cell and press <strong>X</strong> to mark it as "no mirror"
        </div>
        
        {isSolved && (
          <div style={{
            backgroundColor: '#81C784',
            color: '#FFFFFF',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 700,
            marginTop: '12px'
          }}>
            🎉 Congratulations! You solved it!
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveLevelCard;
