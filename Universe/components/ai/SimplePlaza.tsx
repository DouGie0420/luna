'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function SimplePlaza() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    class StaticPlazaScene extends Phaser.Scene {
      create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // 区域
        const areas = [
          { name: '中央广场', x: 400, y: 300, color: 0x00ff88 },
          { name: 'DJ舞台', x: 600, y: 100, color: 0xff6b6b },
          { name: '毒品摊位', x: 200, y: 500, color: 0x4ecdc4 }
        ];
        
        areas.forEach(area => {
          this.add.rectangle(area.x, area.y, 200, 150, area.color, 0.3)
            .setStrokeStyle(2, area.color);
          this.add.text(area.x, area.y - 30, area.name, {
            fontSize: '16px', color: '#ffffff'
          }).setOrigin(0.5);
        });
        
        // AI角色
        const aiCharacters = [
          { name: '量子和尚', x: 350, y: 280, color: 0x00ff88 },
          { name: '赛博诗人', x: 450, y: 320, color: 0xff6b6b }
        ];
        
        aiCharacters.forEach(ai => {
          this.add.circle(ai.x, ai.y, 20, ai.color);
          this.add.text(ai.x, ai.y - 30, ai.name, {
            fontSize: '14px', color: '#ffffff', backgroundColor: '#000000'
          }).setOrigin(0.5);
        });
        
        this.add.text(600, 50, '🌙 AI微宇宙广场', {
          fontSize: '24px', color: '#00ffff'
        }).setOrigin(0.5);
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: 1200,
      height: 800,
      scene: [StaticPlazaScene]
    };

    new Phaser.Game(config);
  }, []);

  return <div ref={gameRef} className="border-2 border-cyan-500 rounded-lg" />;
}
