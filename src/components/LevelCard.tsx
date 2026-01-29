import React, { useState } from 'react';
import type { LevelData, Cell } from '../engine/types';

interface LevelCardProps {
  level: LevelData;
  onRegenerate: () => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, onRegenerate }) => {
  const { size, grid, clues, paths } = level;
  const [showDebug, setShowDebug] = useState(false);

  const cellSize = 50;
  const clueSize = 35;
  const gridPadding = 2;
  const gridWidth = size * cellSize + gridPadding * 2;
  const gridHeight = size * cellSize + gridPadding * 2;

  // 糖果色系 - 鹅黄、浅绿、淡紫、粉蓝
  const candyColors = {
    cardBg: '#FFF9E6', // 鹅黄背景
    cardBorder: '#FFD93D', // 鹅黄边框
    gridBg: '#E8F5E9', // 浅绿背景
    gridBorder: '#81C784', // 浅绿边框
    cellBg: '#FFFFFF', // 白色
    cellBorder: '#E1BEE7', // 淡紫边框
    mirror: '#FFD93D', // 鹅黄镜子
    mirrorAlt: '#81C784', // 浅绿镜子
    clue: '#9C27B0', // 淡紫色数字
    text: '#5A5A5A', // 深灰文字
    button: '#B3D9FF', // 粉蓝按钮
    buttonHover: '#90CAF9', // 深粉蓝
    debug: '#F3E5F5', // 极浅紫
    pathColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'], // 光路颜色
  };

  const getMirrors = () => {
    const mirrors: string[] = [];
    grid.forEach((row: Cell[], r: number) => {
      row.forEach((cell: Cell, c: number) => {
        if (cell.mirror) {
          mirrors.push(`(${r}, ${c}): ${cell.mirror}`);
        }
      });
    });
    return mirrors;
  };

  // 渲染45度角的镜子
  // 注意：显示时反转符号（'/' 显示为 '\'，'\' 显示为 '/'），但逻辑保持不变
  const renderMirror = (mirrorType: '/' | '\\') => {
    // 反转显示：实际是 '/' 但显示为 '\'，实际是 '\' 但显示为 '/'
    const displayAsForward = mirrorType === '\\'; // 反转：如果实际是 '\'，显示为 '/'
    const rotation = displayAsForward ? '45deg' : '-45deg';
    const mirrorColor = '#1565C0'; // 深蓝色
    
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

  // 绘制光路路径
  const renderPaths = () => {
    if (!paths || paths.length === 0) return null;

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
        {paths.map((pathData, pathIdx) => {
          const pathColor = candyColors.pathColors[pathIdx % candyColors.pathColors.length];
          
          // 构建路径点
          const entryPoint = getEntryExitPoint(pathData.entry.side, pathData.entry.index);
          const exitPoint = getEntryExitPoint(pathData.exit.side, pathData.exit.index);
          
          const points: Array<{ x: number; y: number }> = [entryPoint];
          
          // 添加路径中的所有点
          pathData.path.forEach((p) => {
            const center = getCellCenter(p.r, p.c);
            points.push(center);
          });
          
          points.push(exitPoint);
          
          // 构建 SVG path
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
      }}>{size}x{size} Level</h3>
      
      <div style={{ 
        display: 'inline-block', 
        position: 'relative',
        userSelect: 'none'
      }}>
        {/* Top Clues */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
          <div style={{ width: clueSize }}></div>
          {clues.top.map((clue: number | string, i: number) => (
            <div key={`top-${i}`} style={{ 
              width: cellSize, 
              textAlign: 'center',
              fontSize: '17px',
              fontWeight: 700,
              color: candyColors.clue
            }}>{clue}</div>
          ))}
          <div style={{ width: clueSize }}></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Left Clues */}
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: '6px' }}>
            {clues.left.map((clue: number | string, i: number) => (
              <div key={`left-${i}`} style={{ 
                height: cellSize, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: clueSize,
                fontSize: '17px',
                fontWeight: 700,
                color: candyColors.clue
              }}>{clue}</div>
            ))}
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
            {grid.flat().map((cell: Cell, i: number) => {
              const r = Math.floor(i / size);
              const c = i % size;
              return (
                <div key={i} style={{ 
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
                }}>
                  {cell.mirror && renderMirror(cell.mirror)}
                </div>
              );
            })}
          </div>

          {/* Right Clues */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px' }}>
            {clues.right.map((clue: number | string, i: number) => (
              <div key={`right-${i}`} style={{ 
                height: cellSize, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: clueSize,
                fontSize: '17px',
                fontWeight: 700,
                color: candyColors.clue
              }}>{clue}</div>
            ))}
          </div>
        </div>

        {/* Bottom Clues */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
          <div style={{ width: clueSize }}></div>
          {clues.bottom.map((clue: number | string, i: number) => (
            <div key={`bottom-${i}`} style={{ 
              width: cellSize, 
              textAlign: 'center',
              fontSize: '17px',
              fontWeight: 700,
              color: candyColors.clue
            }}>{clue}</div>
          ))}
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
          ✨ Regenerate Level
        </button>
        
        <button 
          onClick={() => setShowDebug(!showDebug)}
          style={{
            backgroundColor: 'transparent',
            color: candyColors.text,
            border: `1px solid ${candyColors.cardBorder}`,
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: "'Kalam', cursive",
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = candyColors.debug;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {showDebug ? '🙈 Hide Debug' : '🔍 Show Debug'}
        </button>

        {showDebug && (
          <div style={{ 
            textAlign: 'left', 
            fontSize: '13px', 
            backgroundColor: candyColors.debug, 
            padding: '12px',
            borderRadius: '8px',
            color: candyColors.text,
            fontFamily: "'Kalam', cursive"
          }}>
            <strong>Mirrors:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {getMirrors().map((m: string, i: number) => <li key={i}>{m}</li>)}
            </ul>
            {paths && paths.length > 0 && (
              <>
                <strong>Paths:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {paths.map((p, i) => (
                    <li key={i}>
                      {p.entry.side}[{p.entry.index}] → {p.exit.side}[{p.exit.index}] (steps: {p.steps})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelCard;
