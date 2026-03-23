'use client';

/**
 * ============================================================
 * 月壤AI微宇宙 - 赛博朋克霓虹渲染引擎 v17.0
 * ============================================================
 * v17 关键突破：
 * 1. 地面不再悬浮！天空只画上40%，下60%全部是地面颜色
 *    瓷砖画在地面之上，边缘自然融入——彻底消除菱形边界
 * 2. 建筑墙面亮度再提高（lightness 20-30%），表面细节更精细
 * 3. 新增：展示橱窗、墙面海报、通风口、楼层分割线、檐口
 */

import { useEffect, useRef, useCallback } from 'react';
import { PLAZA_WIDTH, PLAZA_HEIGHT, AVATAR_COLORS } from '../lib/constants';
import type { PlazaAgentState, DJLiveState, TransientMessage } from '../types';

const CW = 1600, CH = 1000;
const COLS = 24, ROWS = 24, TW = 96, TH = 48, OX = 1200, OY = 60;

interface Cam { x: number; y: number; z: number; tx: number; ty: number; tz: number; }
function mkCam(): Cam {
  const cx = OX, cy = OY + COLS * (TH / 2) + 40;
  return { x: cx, y: cy, z: 0.95, tx: cx, ty: cy, tz: 0.95 };
}
type V2 = [number, number];
function iso(c: number, r: number): V2 { return [OX + (c - r) * (TW / 2), OY + (c + r) * (TH / 2)]; }
function w2v(wx: number, wy: number, cam: Cam): V2 { return [(wx - cam.x) * cam.z + CW / 2, (wy - cam.y) * cam.z + CH / 2]; }
function p2w(px: number, py: number): V2 { return iso((px / PLAZA_WIDTH) * COLS, (py / PLAZA_HEIGHT) * ROWS); }
type X = CanvasRenderingContext2D;

function sr(a: number, b: number, s: number = 0): number {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}
function sClr(s: string): string {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ==================================================================
//   背景：天空 + 地面（一体化渲染，不再分离！）
// ==================================================================
function drawBackground(ctx: X, cam: Cam, f: number) {
  // ========== 第一步：整个画布填充为地面底色 ==========
  // 这确保了任何位置缩放后，底色都是地面——不会暴露天空
  ctx.fillStyle = '#0C0E24';
  ctx.fillRect(0, 0, CW, CH);

  // ========== 第二步：上半部分覆盖天空渐变 ==========
  // 天空只画到画布40%高度处，下方60%保持地面色
  const skyH = CH * 0.38;
  const skyG = ctx.createLinearGradient(0, 0, 0, skyH + 80);
  skyG.addColorStop(0, '#010108');
  skyG.addColorStop(0.3, '#030315');
  skyG.addColorStop(0.65, '#060820');
  skyG.addColorStop(0.85, '#090C24');
  skyG.addColorStop(1, '#0C0E24');  // 和地面底色完全一致！无缝过渡
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, CW, skyH + 80);

  // 星云
  const neb: [number, number, number, number, string][] = [
    [CW * 0.72, CH * 0.12, 240, 160, 'rgba(120,40,160,0.04)'],
    [CW * 0.64, CH * 0.16, 280, 180, 'rgba(80,20,140,0.03)'],
    [CW * 0.82, CH * 0.08, 200, 140, 'rgba(160,50,180,0.035)'],
    [CW * 0.12, CH * 0.1, 200, 150, 'rgba(30,60,180,0.03)'],
    [CW * 0.45, CH * 0.2, 300, 200, 'rgba(80,30,120,0.018)'],
  ];
  for (const [nx, ny, nw, nh, nc] of neb) {
    ctx.fillStyle = nc; ctx.beginPath();
    ctx.ellipse(nx + Math.sin(f * 0.003) * 8, ny + Math.cos(f * 0.002) * 5, nw, nh, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 星星（只在天空区域）
  for (let i = 0; i < 120; i++) {
    const sx2 = sr(i, 0, 77) * CW, sy2 = sr(i, 1, 77) * skyH;
    const tw = 0.3 + sr(i, 2, 77) * 0.5 + Math.sin(f * 0.02 + i * 1.3) * 0.18;
    ctx.globalAlpha = Math.max(0.08, Math.min(0.95, tw));
    ctx.fillStyle = '#DDDDEF';
    const sz = sr(i, 3, 77);
    if (sz < 0.05) {
      ctx.fillRect(sx2 - 1, sy2, 3, 1); ctx.fillRect(sx2, sy2 - 1, 1, 3);
    } else {
      ctx.fillRect(sx2, sy2, sz < 0.2 ? 2 : 1, sz < 0.2 ? 2 : 1);
    }
  }
  ctx.globalAlpha = 1;

  // 月亮
  const mx = CW * 0.76, my = CH * 0.12, mr = 82;
  for (const [r2, c2] of [
    [mr + 150, 'rgba(140,160,220,0.008)'], [mr + 100, 'rgba(160,180,230,0.012)'],
    [mr + 65, 'rgba(180,195,235,0.02)'], [mr + 35, 'rgba(200,210,240,0.04)'],
    [mr + 15, 'rgba(210,220,245,0.06)'],
  ] as [number, string][]) {
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(mx, my, r2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#C8D8EA'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(220,230,248,0.25)'; ctx.beginPath(); ctx.arc(mx - 15, my - 10, mr * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(6,6,20,0.3)'; ctx.beginPath(); ctx.arc(mx + 22, my - 8, mr * 0.82, 0, Math.PI * 2); ctx.fill();
  for (const [cx2, cy2, cr2] of [[-20, 12, 12], [-5, -20, 8], [-30, -8, 6], [8, 22, 10], [-15, 28, 7]] as number[][]) {
    ctx.fillStyle = 'rgba(100,110,140,0.1)'; ctx.beginPath(); ctx.arc(mx + cx2, my + cy2, cr2, 0, Math.PI * 2); ctx.fill();
  }

  // ========== 第三步：地面上画微弱的大面积光晕（城市灯光映照效果）==========
  // 中心区域微弱暖色光晕——让地面中心稍亮
  const [cwx, cwy] = iso(COLS / 2, ROWS / 2);
  const [cvx, cvy] = w2v(cwx, cwy, cam);
  const cityGlow = ctx.createRadialGradient(cvx, cvy, 0, cvx, cvy, 500 * cam.z);
  cityGlow.addColorStop(0, 'rgba(40,30,80,0.12)');
  cityGlow.addColorStop(0.4, 'rgba(30,20,60,0.06)');
  cityGlow.addColorStop(1, 'rgba(12,14,36,0)');
  ctx.fillStyle = cityGlow;
  ctx.fillRect(0, 0, CW, CH);

  // ========== 第四步：画等距瓷砖网格 ==========
  const z = cam.z;
  for (let r = -2; r <= ROWS + 2; r++) {
    for (let c = -2; c <= COLS + 2; c++) {
      const [wx, wy] = iso(c, r);
      const [vx, vy] = w2v(wx, wy, cam);
      if (vx < -TW * z * 2 || vx > CW + TW * z * 2 || vy < -TH * z * 2 || vy > CH + TH * z * 2) continue;

      const hw = TW / 2 * z, hh = TH / 2 * z;
      const inGrid = c >= 0 && c < COLS && r >= 0 && r < ROWS;
      const isPath = inGrid && ((c >= 10 && c <= 14) || (r >= 10 && r <= 14));

      // 网格外区域的瓷砖：alpha逐渐降低，自然消融入地面底色
      let tileAlpha = 1;
      if (!inGrid) {
        const dist = Math.max(
          Math.max(0, -c, c - COLS + 1),
          Math.max(0, -r, r - ROWS + 1)
        );
        tileAlpha = Math.max(0, 1 - dist * 0.4);
      }

      if (tileAlpha < 0.05) continue;

      const rv = sr(c, r, 1);
      // 瓷砖颜色——比地面底色(#0C0E24)稍亮，形成纹理
      const base = isPath ? 20 + (rv * 6) | 0 : 14 + ((c * 3 + r * 7) % 3) * 2;
      const blueShift = isPath ? 18 : 14;

      ctx.globalAlpha = tileAlpha;
      ctx.fillStyle = `rgb(${base},${base},${base + blueShift})`;
      ctx.beginPath();
      ctx.moveTo(vx, vy - hh); ctx.lineTo(vx + hw, vy);
      ctx.lineTo(vx, vy + hh); ctx.lineTo(vx - hw, vy);
      ctx.closePath(); ctx.fill();

      // 瓷砖缝线
      ctx.strokeStyle = isPath ? 'rgba(80,60,200,0.12)' : 'rgba(40,40,80,0.15)';
      ctx.lineWidth = 0.4 * z; ctx.stroke();

      // 内部网格的瓷砖厚度
      if (inGrid && tileAlpha > 0.5) {
        const wh = 3 * z;
        ctx.fillStyle = `rgba(6,6,18,${tileAlpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(vx - hw, vy); ctx.lineTo(vx, vy + hh);
        ctx.lineTo(vx, vy + hh + wh); ctx.lineTo(vx - hw, vy + wh);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(4,4,14,${tileAlpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(vx + hw, vy); ctx.lineTo(vx, vy + hh);
        ctx.lineTo(vx, vy + hh + wh); ctx.lineTo(vx + hw, vy + wh);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ==================================================================
//   实心等距方块（建筑核心——墙面亮度提升！）
// ==================================================================
function solidBox(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  hueBase: number, sat: number, lightL: number, lightR: number, lightT: number) {
  // 左面
  const lG = ctx.createLinearGradient(sx - hw, sy - bh, sx, sy + hd);
  lG.addColorStop(0, `hsl(${hueBase},${sat}%,${lightL + 6}%)`);
  lG.addColorStop(1, `hsl(${hueBase},${sat}%,${lightL - 2}%)`);
  ctx.fillStyle = lG; ctx.beginPath();
  ctx.moveTo(sx - hw, sy - bh); ctx.lineTo(sx, sy - bh + hd);
  ctx.lineTo(sx, sy + hd); ctx.lineTo(sx - hw, sy); ctx.closePath(); ctx.fill();
  // 右面
  const rG = ctx.createLinearGradient(sx, sy - bh + hd, sx + hw, sy);
  rG.addColorStop(0, `hsl(${hueBase},${sat}%,${lightR + 6}%)`);
  rG.addColorStop(1, `hsl(${hueBase},${sat}%,${lightR - 2}%)`);
  ctx.fillStyle = rG; ctx.beginPath();
  ctx.moveTo(sx + hw, sy - bh); ctx.lineTo(sx, sy - bh + hd);
  ctx.lineTo(sx, sy + hd); ctx.lineTo(sx + hw, sy); ctx.closePath(); ctx.fill();
  // 顶面
  ctx.fillStyle = `hsl(${hueBase},${sat}%,${lightT}%)`;
  ctx.beginPath();
  ctx.moveTo(sx, sy - bh - hd); ctx.lineTo(sx + hw, sy - bh);
  ctx.lineTo(sx, sy - bh + hd); ctx.lineTo(sx - hw, sy - bh);
  ctx.closePath(); ctx.fill();
}

// ==================================================================
//   建筑外立面装饰组件
// ==================================================================

// 楼层分割线（水平金属条 + 微弱檐口阴影）
function floorLines(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  floors: number, hue: number, z: number) {
  for (let i = 1; i < floors; i++) {
    const t = i / floors;
    const ly = sy - bh * t;
    // 左面——亮色分割线
    ctx.strokeStyle = `hsl(${hue},25%,32%)`;
    ctx.lineWidth = Math.max(1.2, 2 * z);
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(sx - hw, ly); ctx.lineTo(sx, ly + hd); ctx.stroke();
    // 右面
    ctx.beginPath(); ctx.moveTo(sx + hw, ly); ctx.lineTo(sx, ly + hd); ctx.stroke();
    // 檐口下阴影（分割线下方一条暗线）
    ctx.strokeStyle = `hsl(${hue},20%,10%)`;
    ctx.lineWidth = Math.max(0.8, 1.2 * z);
    ctx.globalAlpha = 0.2;
    const sly = ly + 2 * z;
    ctx.beginPath(); ctx.moveTo(sx - hw, sly); ctx.lineTo(sx, sly + hd); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + hw, sly); ctx.lineTo(sx, sly + hd); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 砖纹纹理（细密的水平线和竖线）
function brickTex(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  color: string, z: number) {
  const rowH = Math.max(4, 6 * z);
  const rows = Math.floor(bh / rowH);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.3, 0.5 * z);
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const ly = sy - bh * t;
    ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.moveTo(sx - hw + 2 * z, ly); ctx.lineTo(sx - 2 * z, ly + hd); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 2 * z, ly + hd); ctx.lineTo(sx + hw - 2 * z, ly); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 管道
function pipes(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  color: string, z: number) {
  // 左面竖管
  const px2 = sx - hw * 0.92, pt = sy - bh * 0.92, pb = sy - bh * 0.05;
  ctx.strokeStyle = 'hsl(0,0%,28%)';
  ctx.lineWidth = Math.max(2.5, 4 * z); ctx.globalAlpha = 0.65;
  ctx.beginPath(); ctx.moveTo(px2, pt); ctx.lineTo(px2, pb); ctx.stroke();
  // 高光
  ctx.strokeStyle = 'hsl(0,0%,38%)';
  ctx.lineWidth = Math.max(0.8, 1.2 * z); ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.moveTo(px2 - 1.5 * z, pt); ctx.lineTo(px2 - 1.5 * z, pb); ctx.stroke();
  // 支架
  ctx.strokeStyle = 'hsl(0,0%,25%)';
  ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.globalAlpha = 0.5;
  for (let b = 0; b < 3; b++) {
    const by2 = pt + (pb - pt) * (b + 0.5) / 3;
    ctx.beginPath(); ctx.moveTo(px2, by2); ctx.lineTo(px2 + 8 * z, by2); ctx.stroke();
  }
  // 管接头
  ctx.fillStyle = color; ctx.globalAlpha = 0.3;
  ctx.fillRect(px2 - 3 * z, pt - 2 * z, 6 * z, 4 * z);
  ctx.fillRect(px2 - 3 * z, pb - 2 * z, 6 * z, 4 * z);
  ctx.globalAlpha = 1;
}

// 通风口（小金属格栅）
function vents(ctx: X, sx: number, sy: number, hw: number, bh: number, z: number, hue: number) {
  const vw = 10 * z, vh = 6 * z;
  // 右面两个通风口
  for (let i = 0; i < 2; i++) {
    const vx = sx + hw * (0.4 + i * 0.35);
    const vy = sy - bh * (0.15 + i * 0.4);
    ctx.fillStyle = `hsl(${hue},10%,10%)`; ctx.fillRect(vx - vw / 2, vy - vh / 2, vw, vh);
    // 格栅横线
    ctx.strokeStyle = `hsl(${hue},15%,30%)`;
    ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.globalAlpha = 0.4;
    for (let g = 0; g < 3; g++) {
      const gy = vy - vh / 2 + vh * (g + 1) / 4;
      ctx.beginPath(); ctx.moveTo(vx - vw / 2, gy); ctx.lineTo(vx + vw / 2, gy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// 墙面霓虹灯带
function wallNeon(ctx: X, x: number, yTop: number, yBot: number, color: string, z: number) {
  ctx.fillStyle = color; ctx.globalAlpha = 0.1;
  ctx.fillRect(x - 6 * z, yTop, 12 * z, yBot - yTop);
  ctx.fillStyle = color; ctx.globalAlpha = 0.5;
  ctx.fillRect(x - 1.5 * z, yTop, 3 * z, yBot - yTop);
  ctx.fillStyle = '#FFF'; ctx.globalAlpha = 0.15;
  ctx.fillRect(x - 0.5 * z, yTop, 1 * z, yBot - yTop);
  ctx.globalAlpha = 1;
}

// 遮阳篷
function awning(ctx: X, sx: number, sy: number, w: number, color: string, z: number) {
  const ah = 8 * z, aw = w;
  ctx.fillStyle = color; ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(sx - aw * 0.4, sy); ctx.lineTo(sx + aw * 0.4, sy);
  ctx.lineTo(sx + aw * 0.55, sy + ah); ctx.lineTo(sx - aw * 0.55, sy + ah);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.globalAlpha = 0.4;
  ctx.fillRect(sx - aw * 0.55, sy + ah, aw * 1.1, 3 * z);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(0.5, 0.8 * z); ctx.globalAlpha = 0.3;
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const lx = sx - aw * 0.4 + aw * 0.8 * t;
    ctx.beginPath(); ctx.moveTo(lx, sy); ctx.lineTo(lx + aw * 0.03, sy + ah); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// 窗户（精细版——窗框、百叶窗、光晕、窗台）
function drawWindows(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  rows: number, cols: number, winColor: string, z: number, seed: number) {
  const ws = Math.max(8, 13 * z), wh = Math.max(11, 17 * z);

  for (let face = 0; face < 2; face++) {
    for (let fy = 0; fy < rows; fy++) {
      for (let fx = 0; fx < cols; fx++) {
        const t = (fx + 0.5) / cols;
        const yOff = (fy + 0.3) / (rows + 0.1);
        let winX: number, winY: number;
        if (face === 0) {
          winX = sx - hw + hw * (0.12 + t * 0.76);
          winY = sy - bh + bh * yOff + (winX - (sx - hw)) * (hd / hw);
        } else {
          winX = sx + hw * (0.12 + t * 0.76);
          winY = sy - bh + bh * yOff + hd - (winX - sx) * (hd / hw);
        }
        const lit = sr(fx + face * 10, fy, seed) > 0.15;
        // 窗洞
        ctx.fillStyle = '#030308';
        ctx.fillRect(winX - ws / 2 - 2.5 * z, winY - wh / 2 - 2.5 * z, ws + 5 * z, wh + 5 * z);
        // 金属窗框
        ctx.strokeStyle = 'hsl(0,0%,30%)';
        ctx.lineWidth = Math.max(1, 1.5 * z); ctx.globalAlpha = 0.5;
        ctx.strokeRect(winX - ws / 2 - 1 * z, winY - wh / 2 - 1 * z, ws + 2 * z, wh + 2 * z);
        ctx.globalAlpha = 1;

        if (!lit) {
          ctx.fillStyle = 'rgba(12,12,30,0.9)';
          ctx.fillRect(winX - ws / 2, winY - wh / 2, ws, wh);
          // 暗窗微弱天光反射
          ctx.fillStyle = 'rgba(50,60,110,0.08)';
          ctx.fillRect(winX - ws / 2, winY - wh / 2, ws * 0.35, wh * 0.25);
          continue;
        }
        const bright = 0.5 + Math.sin(seed * 3 + fx * 2 + fy * 1.7 + face * 5) * 0.2;
        // 窗户外散光晕
        ctx.fillStyle = winColor; ctx.globalAlpha = bright * 0.08;
        ctx.beginPath(); ctx.arc(winX, winY, ws * 3.5, 0, Math.PI * 2); ctx.fill();
        // 窗户玻璃光
        ctx.globalAlpha = bright * 0.88;
        ctx.fillStyle = winColor;
        ctx.fillRect(winX - ws / 2, winY - wh / 2, ws, wh);
        // 百叶窗横线
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = Math.max(0.3, 0.5 * z); ctx.globalAlpha = 0.4;
        for (let bl = 1; bl <= 3; bl++) {
          const by2 = winY - wh / 2 + wh * bl / 4;
          ctx.beginPath(); ctx.moveTo(winX - ws / 2, by2); ctx.lineTo(winX + ws / 2, by2); ctx.stroke();
        }
        // 十字窗格
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = Math.max(0.8, 1.2 * z); ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(winX, winY - wh / 2); ctx.lineTo(winX, winY + wh / 2);
        ctx.moveTo(winX - ws / 2, winY); ctx.lineTo(winX + ws / 2, winY);
        ctx.stroke();
        // 窗台
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.globalAlpha = 0.5;
        ctx.fillRect(winX - ws / 2 - 1.5 * z, winY + wh / 2 + 1 * z, ws + 3 * z, 2.5 * z);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// 一楼展示橱窗（大型、明亮、显示内部物品）
function shopWindow(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  color: string, z: number, side: 'L' | 'R') {
  const swW = 28 * z, swH = 22 * z;
  const swX = side === 'L' ? sx - hw * 0.6 : sx + hw * 0.55;
  const swY = sy - bh * 0.08;
  // 橱窗框
  ctx.fillStyle = '#020208'; ctx.fillRect(swX - swW / 2 - 2 * z, swY - swH - 2 * z, swW + 4 * z, swH + 4 * z);
  // 橱窗玻璃（明亮）
  const swG = ctx.createLinearGradient(swX, swY - swH, swX, swY);
  swG.addColorStop(0, color);
  swG.addColorStop(1, 'rgba(255,255,255,0.15)');
  ctx.fillStyle = swG; ctx.globalAlpha = 0.6;
  ctx.fillRect(swX - swW / 2, swY - swH, swW, swH);
  // 内部物品剪影（深色小方块）
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.globalAlpha = 0.35;
  ctx.fillRect(swX - 6 * z, swY - swH + 5 * z, 5 * z, 8 * z);
  ctx.fillRect(swX + 3 * z, swY - swH + 3 * z, 4 * z, 10 * z);
  ctx.fillRect(swX - 2 * z, swY - swH + 12 * z, 7 * z, 5 * z);
  // 光晕
  ctx.fillStyle = color; ctx.globalAlpha = 0.06;
  ctx.beginPath(); ctx.arc(swX, swY - swH / 2, swW, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// 霓虹边线（微弱辅助）
function neonTrim(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number,
  color: string, z: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 3.5 * z); ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.moveTo(sx, sy - bh - hd); ctx.lineTo(sx + hw, sy - bh);
  ctx.lineTo(sx, sy - bh + hd); ctx.lineTo(sx - hw, sy - bh); ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - hw, sy - bh); ctx.lineTo(sx - hw, sy);
  ctx.moveTo(sx + hw, sy - bh); ctx.lineTo(sx + hw, sy);
  ctx.moveTo(sx, sy - bh + hd); ctx.lineTo(sx, sy + hd);
  ctx.moveTo(sx - hw, sy); ctx.lineTo(sx, sy + hd); ctx.lineTo(sx + hw, sy);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, 1.2 * z); ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(sx, sy - bh - hd); ctx.lineTo(sx + hw, sy - bh);
  ctx.lineTo(sx, sy - bh + hd); ctx.lineTo(sx - hw, sy - bh); ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - hw, sy - bh); ctx.lineTo(sx - hw, sy);
  ctx.moveTo(sx + hw, sy - bh); ctx.lineTo(sx + hw, sy);
  ctx.moveTo(sx, sy - bh + hd); ctx.lineTo(sx, sy + hd);
  ctx.moveTo(sx - hw, sy); ctx.lineTo(sx, sy + hd); ctx.lineTo(sx + hw, sy);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// 招牌
function bigSign(ctx: X, sx: number, sy: number, text: string, color: string, z: number) {
  ctx.save();
  const fs = Math.max(10, 16 * z);
  ctx.font = `bold ${fs | 0}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  const pad = 14 * z, sh = 28 * z, sw = tw + pad * 2;
  ctx.fillStyle = 'rgba(4,4,12,0.92)';
  ctx.fillRect(sx - sw / 2, sy - sh / 2, sw, sh);
  ctx.shadowColor = color; ctx.shadowBlur = 22;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, 2.5 * z);
  ctx.strokeRect(sx - sw / 2, sy - sh / 2, sw, sh);
  ctx.fillStyle = color;
  ctx.fillText(text, sx, sy + fs * 0.3);
  ctx.shadowBlur = 4; ctx.fillStyle = '#FFF'; ctx.globalAlpha = 0.3;
  ctx.fillText(text, sx, sy + fs * 0.3);
  ctx.restore();
}

// 屋顶设备
function roofStuff(ctx: X, sx: number, sy: number, hw: number, hd: number, bh: number, z: number, hue: number) {
  const ty = sy - bh;
  solidBox(ctx, sx + hw * 0.3, ty + 3 * z, 16 * z, 7 * z, 14 * z, hue, 12, 20, 24, 28);
  solidBox(ctx, sx - hw * 0.25, ty + 2 * z, 12 * z, 5 * z, 18 * z, hue, 10, 18, 22, 26);
  ctx.fillStyle = '#2A2A44'; ctx.fillRect(sx + hw * 0.1, ty - 28 * z, 2.5 * z, 30 * z);
  ctx.fillStyle = `hsl(${hue},80%,55%)`;
  ctx.fillRect(sx + hw * 0.1 - 1.5 * z, ty - 30 * z, 5 * z, 3 * z);
  ctx.fillStyle = 'hsl(0,0%,24%)'; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.ellipse(sx - hw * 0.5, ty + 1 * z, 8 * z, 4 * z, -0.3, 0, Math.PI); ctx.fill();
  ctx.globalAlpha = 1;
}

// 门
function door(ctx: X, sx: number, sy: number, hw: number, hd: number, z: number, color: string, side: 'L' | 'R') {
  const dw = Math.max(10, 16 * z), dh = Math.max(14, 28 * z);
  const dx = side === 'L' ? sx - hw * 0.38 : sx + hw * 0.38;
  const dy = sy + hd * 0.62;
  ctx.fillStyle = '#020208'; ctx.fillRect(dx - dw / 2, dy - dh, dw, dh);
  const grd = ctx.createLinearGradient(dx, dy - dh, dx, dy);
  grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.globalAlpha = 0.3;
  ctx.fillRect(dx - dw / 2, dy - dh, dw, dh);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'hsl(0,0%,30%)'; ctx.lineWidth = Math.max(1, 1.5 * z); ctx.globalAlpha = 0.4;
  ctx.strokeRect(dx - dw / 2, dy - dh, dw, dh); ctx.globalAlpha = 1;
  ctx.fillStyle = 'hsl(0,0%,24%)';
  ctx.fillRect(dx - dw / 2 - 3 * z, dy, dw + 6 * z, 4 * z);
  ctx.fillStyle = 'hsl(0,0%,20%)';
  ctx.fillRect(dx - dw / 2 - 5 * z, dy + 4 * z, dw + 10 * z, 3 * z);
}

function shadow(ctx: X, sx: number, sy: number, hw: number, hd: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(sx, sy + hd * 0.4, hw * 1.4, hd, 0, 0, Math.PI * 2); ctx.fill();
}

function baseGlow(ctx: X, sx: number, sy: number, hw: number, hd: number, color: string) {
  ctx.fillStyle = color; ctx.globalAlpha = 0.08;
  ctx.beginPath(); ctx.ellipse(sx, sy + hd * 0.3, hw * 2, hd * 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ==================================================================
//   各建筑（墙面亮度提升至20-30%，细节更丰富）
// ==================================================================

// LIBRARY
function drawLibrary(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(180, 220);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 130 * z, hd = 55 * z, bh = 200 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw, hd, '#FF2244');
  // 基座（亮度提升）
  solidBox(ctx, sx, sy, hw + 8 * z, hd + 4 * z, 14 * z, 0, 8, 20, 24, 28);
  // 主体——红色调（亮度 20/24/30，比v16的16/20/25更亮！）
  solidBox(ctx, sx, sy - 14 * z, hw, hd, bh, 350, 50, 20, 24, 30);
  floorLines(ctx, sx, sy - 14 * z, hw, hd, bh, 4, 350, z);
  brickTex(ctx, sx, sy - 14 * z, hw, hd, bh, '#FF4466', z);
  pipes(ctx, sx, sy - 14 * z, hw, hd, bh, '#FF2244', z);
  vents(ctx, sx, sy - 14 * z, hw, bh, z, 350);
  drawWindows(ctx, sx, sy - 14 * z, hw, hd, bh, 4, 4, '#FFE088', z, 100);
  shopWindow(ctx, sx, sy - 14 * z, hw, hd, bh, '#FF6644', z, 'R');
  neonTrim(ctx, sx, sy - 14 * z, hw, hd, bh, '#FF2244', z);
  wallNeon(ctx, sx - hw + 3 * z, sy - 14 * z - bh + 20 * z, sy - 14 * z - 10 * z, '#FF2244', z);
  door(ctx, sx, sy - 14 * z, hw, hd, z, '#FF6644', 'L');
  awning(ctx, sx - hw * 0.38, sy - 14 * z - bh * 0.12, 35 * z, '#FF2244', z);
  roofStuff(ctx, sx, sy - 14 * z, hw, hd, bh, z, 350);
  bigSign(ctx, sx, sy - 14 * z - bh - 25 * z, 'LIBRARY', '#FF2244', z);
}

// PSYCHEDELIC SHOP
function drawPsychShop(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(460, 180);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 115 * z, hd = 50 * z, bh = 180 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw, hd, '#9944FF');
  solidBox(ctx, sx, sy, hw + 6 * z, hd + 3 * z, 12 * z, 270, 8, 19, 23, 27);
  solidBox(ctx, sx, sy - 12 * z, hw, hd, bh, 275, 45, 19, 23, 29);
  floorLines(ctx, sx, sy - 12 * z, hw, hd, bh, 4, 275, z);
  brickTex(ctx, sx, sy - 12 * z, hw, hd, bh, '#AA55FF', z);
  pipes(ctx, sx, sy - 12 * z, hw, hd, bh, '#9944FF', z);
  vents(ctx, sx, sy - 12 * z, hw, bh, z, 275);

  // 迷幻多彩窗（特殊）
  const pColors = ['#FF44AA', '#9944FF', '#00DDCC', '#44FF66', '#FFD700', '#FF8844'];
  const ws2 = Math.max(8, 13 * z), wh2 = Math.max(11, 17 * z);
  for (let face = 0; face < 2; face++) {
    for (let fy = 0; fy < 4; fy++) {
      for (let fx = 0; fx < 3; fx++) {
        const t = (fx + 0.5) / 3;
        const yOff = (fy + 0.3) / 4.1;
        let winX: number, winY: number;
        if (face === 0) {
          winX = sx - hw + hw * (0.12 + t * 0.76);
          winY = sy - 12 * z - bh + bh * yOff + (winX - (sx - hw)) * (hd / hw);
        } else {
          winX = sx + hw * (0.12 + t * 0.76);
          winY = sy - 12 * z - bh + bh * yOff + hd - (winX - sx) * (hd / hw);
        }
        const wc = pColors[(fx + fy * 3 + face * 2 + (f * 0.006 | 0)) % 6];
        const bright = 0.55 + Math.sin(f * 0.03 + fx * 2.5 + fy * 1.8) * 0.15;
        ctx.fillStyle = '#030308';
        ctx.fillRect(winX - ws2 / 2 - 2.5 * z, winY - wh2 / 2 - 2.5 * z, ws2 + 5 * z, wh2 + 5 * z);
        ctx.fillStyle = wc; ctx.globalAlpha = bright * 0.07;
        ctx.beginPath(); ctx.arc(winX, winY, ws2 * 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = bright * 0.85; ctx.fillStyle = wc;
        ctx.fillRect(winX - ws2 / 2, winY - wh2 / 2, ws2, wh2);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.6, 1 * z); ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(winX, winY - wh2 / 2); ctx.lineTo(winX, winY + wh2 / 2);
        ctx.moveTo(winX - ws2 / 2, winY); ctx.lineTo(winX + ws2 / 2, winY);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  shopWindow(ctx, sx, sy - 12 * z, hw, hd, bh, '#FF44AA', z, 'L');
  neonTrim(ctx, sx, sy - 12 * z, hw, hd, bh, '#9944FF', z);
  wallNeon(ctx, sx - hw + 3 * z, sy - 12 * z - bh + 15 * z, sy - 12 * z - 8 * z, '#FF44AA', z);
  wallNeon(ctx, sx + hw - 3 * z, sy - 12 * z - bh + 15 * z, sy - 12 * z - 8 * z, '#9944FF', z);
  door(ctx, sx, sy - 12 * z, hw, hd, z, '#FF44AA', 'L');
  awning(ctx, sx - hw * 0.38, sy - 12 * z - bh * 0.1, 30 * z, '#9944FF', z);
  roofStuff(ctx, sx, sy - 12 * z, hw, hd, bh, z, 275);
  bigSign(ctx, sx, sy - 12 * z - bh - 25 * z, 'PSYCHEDELIC SHOP', '#9944FF', z);
  // 烟雾
  for (let i = 0; i < 7; i++) {
    const smX = sx + Math.sin(f * 0.01 + i * 1.2) * 28 * z;
    const smY = sy - 12 * z - bh - 38 * z - i * 22 * z;
    ctx.fillStyle = pColors[i % 6]; ctx.globalAlpha = Math.max(0, 0.06 - i * 0.007);
    ctx.beginPath(); ctx.arc(smX, smY, (10 + i * 5) * z, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ALTAR
function drawAltar(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(1020, 200);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 125 * z, hd = 54 * z, bh = 195 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw, hd, '#00DDCC');
  for (let layer = 0; layer < 3; layer++) {
    const lhw = hw - layer * 18 * z, lhd = hd - layer * 7 * z;
    const lbh = bh / 3;
    const lsy = sy - layer * lbh;
    solidBox(ctx, sx, lsy, lhw, lhd, lbh, 180, 35, 17 + layer * 4, 21 + layer * 4, 26 + layer * 4);
    brickTex(ctx, sx, lsy, lhw, lhd, lbh, '#00BBAA', z);
  }
  floorLines(ctx, sx, sy, hw, hd, bh, 3, 180, z);
  drawWindows(ctx, sx, sy, hw, hd, bh, 4, 4, '#00DDCC', z, 300);
  shopWindow(ctx, sx, sy, hw, hd, bh, '#00DDCC', z, 'R');
  neonTrim(ctx, sx, sy, hw, hd, bh, '#00DDCC', z);
  pipes(ctx, sx, sy, hw, hd, bh, '#00DDCC', z);
  vents(ctx, sx, sy, hw, bh, z, 180);
  door(ctx, sx, sy, hw, hd, z, '#00DDCC', 'R');
  // ₿ 符号
  const coinY = sy - bh - 40 * z, coinR = 16 * z;
  const cG2 = 0.6 + Math.sin(f * 0.03) * 0.2;
  ctx.fillStyle = '#FFD700'; ctx.globalAlpha = cG2 * 0.08;
  ctx.beginPath(); ctx.arc(sx, coinY, coinR * 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = cG2;
  ctx.beginPath(); ctx.arc(sx, coinY, coinR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0A0A20'; ctx.globalAlpha = cG2 * 0.8;
  ctx.font = `bold ${Math.max(11, 18 * z) | 0}px monospace`; ctx.textAlign = 'center';
  ctx.fillText('₿', sx, coinY + 7 * z); ctx.globalAlpha = 1;
  roofStuff(ctx, sx, sy, hw, hd, bh, z, 180);
  bigSign(ctx, sx, sy - bh - 60 * z, 'ALTAR', '#00DDCC', z);
}

// REST AREA
function drawRestArea(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(1040, 550);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 120 * z, hd = 50 * z, bh = 180 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw, hd, '#44FF66');
  solidBox(ctx, sx, sy, hw + 6 * z, hd + 3 * z, 12 * z, 130, 8, 19, 23, 27);
  solidBox(ctx, sx, sy - 12 * z, hw, hd, bh, 140, 40, 18, 22, 28);
  floorLines(ctx, sx, sy - 12 * z, hw, hd, bh, 4, 140, z);
  brickTex(ctx, sx, sy - 12 * z, hw, hd, bh, '#44FF66', z);
  drawWindows(ctx, sx, sy - 12 * z, hw, hd, bh, 4, 4, '#FFE088', z, 400);
  shopWindow(ctx, sx, sy - 12 * z, hw, hd, bh, '#44FF66', z, 'R');
  neonTrim(ctx, sx, sy - 12 * z, hw, hd, bh, '#44FF66', z);
  pipes(ctx, sx, sy - 12 * z, hw, hd, bh, '#44FF66', z);
  vents(ctx, sx, sy - 12 * z, hw, bh, z, 140);
  wallNeon(ctx, sx - hw + 3 * z, sy - 12 * z - bh + 20 * z, sy - 12 * z - 10 * z, '#44FF66', z);
  door(ctx, sx, sy - 12 * z, hw, hd, z, '#44FF66', 'R');
  awning(ctx, sx + hw * 0.38, sy - 12 * z - bh * 0.12, 35 * z, '#44FF66', z);
  roofStuff(ctx, sx, sy - 12 * z, hw, hd, bh, z, 140);
  bigSign(ctx, sx, sy - 12 * z - bh - 25 * z, 'REST AREA', '#44FF66', z);
}

// HALL OF FAME
function drawHallOfFame(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(160, 550);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 130 * z, hd = 55 * z, bh = 200 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw, hd, '#FFB844');
  solidBox(ctx, sx, sy, hw + 8 * z, hd + 4 * z, 14 * z, 40, 8, 20, 24, 28);
  solidBox(ctx, sx, sy - 14 * z, hw, hd, bh, 42, 45, 19, 23, 29);
  floorLines(ctx, sx, sy - 14 * z, hw, hd, bh, 4, 42, z);
  brickTex(ctx, sx, sy - 14 * z, hw, hd, bh, '#FFB844', z);
  drawWindows(ctx, sx, sy - 14 * z, hw, hd, bh, 4, 4, '#FFE088', z, 500);
  shopWindow(ctx, sx, sy - 14 * z, hw, hd, bh, '#FFB844', z, 'L');
  neonTrim(ctx, sx, sy - 14 * z, hw, hd, bh, '#FFB844', z);
  pipes(ctx, sx, sy - 14 * z, hw, hd, bh, '#FFB844', z);
  vents(ctx, sx, sy - 14 * z, hw, bh, z, 42);
  wallNeon(ctx, sx + hw - 3 * z, sy - 14 * z - bh + 20 * z, sy - 14 * z - 10 * z, '#FFB844', z);
  door(ctx, sx, sy - 14 * z, hw, hd, z, '#FFB844', 'L');
  awning(ctx, sx - hw * 0.38, sy - 14 * z - bh * 0.12, 35 * z, '#FFB844', z);
  // 柱子
  for (let i = 0; i < 2; i++) {
    const px2 = sx - hw * (0.25 + i * 0.5);
    ctx.fillStyle = '#FFB844'; ctx.globalAlpha = 0.22;
    ctx.fillRect(px2 - 3 * z, sy - 14 * z - bh * 0.85, 6 * z, bh * 0.85);
    ctx.fillStyle = '#FFB844'; ctx.globalAlpha = 0.35;
    ctx.fillRect(px2 - 5 * z, sy - 14 * z - bh * 0.85 - 3 * z, 10 * z, 4 * z);
    ctx.globalAlpha = 1;
  }
  // 旗帜
  const flagY = sy - 14 * z - bh - 14 * z;
  ctx.fillStyle = '#2A2A44'; ctx.fillRect(sx - 2 * z, flagY - 32 * z, 4 * z, 46 * z);
  ctx.fillStyle = '#FFB844'; ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(sx + 2 * z, flagY - 32 * z);
  ctx.lineTo(sx + 20 * z + Math.sin(f * 0.025) * 3 * z, flagY - 24 * z);
  ctx.lineTo(sx + 2 * z, flagY - 16 * z); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  roofStuff(ctx, sx, sy - 14 * z, hw, hd, bh, z, 42);
  bigSign(ctx, sx, sy - 14 * z - bh - 42 * z, 'HALL OF FAME', '#FFB844', z);
}

// 瞭望塔
function drawTower(ctx: X, cam: Cam, f: number, px: number, py: number, hue: number, color: string) {
  const [wx, wy] = p2w(px, py);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 45 * z, hd = 20 * z, bh = 230 * z;
  shadow(ctx, sx, sy, hw * 1.3, hd * 1.3);
  baseGlow(ctx, sx, sy, hw, hd, color);
  solidBox(ctx, sx, sy, hw + 4 * z, hd + 2 * z, 10 * z, hue, 8, 19, 23, 27);
  solidBox(ctx, sx, sy - 10 * z, hw, hd, bh, hue, 35, 18, 22, 28);
  floorLines(ctx, sx, sy - 10 * z, hw, hd, bh, 6, hue, z);
  brickTex(ctx, sx, sy - 10 * z, hw, hd, bh, color, z);
  wallNeon(ctx, sx - hw + 2 * z, sy - 10 * z - bh + 10 * z, sy - 10 * z - 5 * z, color, z);
  for (let fy = 0; fy < 6; fy++) {
    const winY = sy - 10 * z - bh + bh * (fy + 0.3) / 6;
    const winX = sx - hw * 0.35;
    const bright = 0.45 + Math.sin(f * 0.02 + fy) * 0.12;
    ctx.fillStyle = '#030308'; ctx.globalAlpha = 0.8;
    ctx.fillRect(winX - 5 * z, winY - 5 * z, 10 * z, 10 * z);
    ctx.fillStyle = color; ctx.globalAlpha = bright * 0.07;
    ctx.beginPath(); ctx.arc(winX, winY, 12 * z, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = bright * 0.8; ctx.fillStyle = color;
    ctx.fillRect(winX - 4 * z, winY - 4 * z, 8 * z, 8 * z);
  }
  ctx.globalAlpha = 1;
  neonTrim(ctx, sx, sy - 10 * z, hw, hd, bh, color, z);
  const topY = sy - 10 * z - bh, rh = 55 * z;
  solidBox(ctx, sx, topY, hw + 4 * z, hd + 2 * z, rh, hue, 22, 16, 20, 25);
  const blinkA = 0.5 + Math.sin(f * 0.08 + px) * 0.5;
  ctx.fillStyle = color; ctx.globalAlpha = blinkA;
  ctx.beginPath(); ctx.arc(sx, topY - rh - 4 * z, 4 * z, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = blinkA * 0.15;
  ctx.beginPath(); ctx.arc(sx, topY - rh - 4 * z, 18 * z, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// DJ STAGE
function drawDJ(ctx: X, cam: Cam, f: number, live: boolean) {
  const [wx, wy] = p2w(600, 420);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  shadow(ctx, sx, sy, 120 * z, 36 * z);
  if (live) baseGlow(ctx, sx, sy, 140 * z, 45 * z, '#FFD700');
  const pw = 120 * z, ph = 35 * z, pd = 16 * z;
  ctx.fillStyle = '#1E1840'; ctx.beginPath();
  ctx.moveTo(sx, sy - ph); ctx.lineTo(sx + pw, sy);
  ctx.lineTo(sx, sy + ph); ctx.lineTo(sx - pw, sy);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.globalAlpha = 0.5;
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#141030'; ctx.beginPath();
  ctx.moveTo(sx - pw, sy); ctx.lineTo(sx, sy + ph);
  ctx.lineTo(sx, sy + ph + pd); ctx.lineTo(sx - pw, sy + pd);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0E0A28'; ctx.beginPath();
  ctx.moveTo(sx + pw, sy); ctx.lineTo(sx, sy + ph);
  ctx.lineTo(sx, sy + ph + pd); ctx.lineTo(sx + pw, sy + pd);
  ctx.closePath(); ctx.fill();
  solidBox(ctx, sx, sy - 18 * z, 40 * z, 16 * z, 24 * z, 250, 28, 20, 24, 30);
  for (const dx of [-16, 16]) {
    const tdx = sx + dx * z, tdy = sy - 42 * z;
    ctx.fillStyle = '#080818'; ctx.beginPath(); ctx.ellipse(tdx, tdy, 13 * z, 6.5 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0E0E22'; ctx.beginPath(); ctx.ellipse(tdx, tdy, 11 * z, 5.5 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(tdx, tdy, 3.5 * z, 1.8 * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  for (const dir of [-1, 1]) {
    const spX = sx + dir * 75 * z, spY = sy + dir * 6 * z;
    solidBox(ctx, spX, spY - 8 * z, 20 * z, 9 * z, 36 * z, 250, 18, 17, 21, 25);
    ctx.fillStyle = '#FFD700'; ctx.globalAlpha = live ? 0.35 : 0.1;
    ctx.beginPath(); ctx.ellipse(spX + (dir < 0 ? 12 : -12) * z, spY - 24 * z, 8 * z, 7 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(spX + (dir < 0 ? 12 : -12) * z, spY - 12 * z, 5 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  const signY = sy - 80 * z;
  ctx.fillStyle = '#222240';
  ctx.fillRect(sx - 70 * z, signY, 3 * z, 70 * z);
  ctx.fillRect(sx + 67 * z, signY, 3 * z, 70 * z);
  ctx.fillRect(sx - 70 * z, signY - 2 * z, 140 * z, 4 * z);
  bigSign(ctx, sx, signY - 24 * z, 'DJ STAGE', '#FFD700', z);
  if (live) {
    const beamC = ['#FFD700', '#00DDCC', '#FF44AA', '#9944FF'];
    for (let i = 0; i < 4; i++) {
      const endX = sx + Math.sin(f * 0.015 + i * 1.5) * 110 * z + (i - 1.5) * 20 * z;
      ctx.strokeStyle = beamC[i]; ctx.lineWidth = Math.max(2, 4 * z); ctx.globalAlpha = 0.06;
      ctx.beginPath(); ctx.moveTo(sx + (i - 1.5) * 32 * z, signY); ctx.lineTo(endX, sy + 45 * z); ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const nx = sx + Math.sin(f * 0.02 + i * 1.3) * 50 * z;
      const ny = sy - 48 * z - i * 18 * z;
      ctx.fillStyle = beamC[i % 4]; ctx.globalAlpha = 0.3 - i * 0.03;
      ctx.font = `${Math.max(8, 14 * z) | 0}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(i % 2 === 0 ? '♪' : '♫', nx, ny);
    }
    ctx.globalAlpha = 1;
  }
}

// 喷泉
function drawFountain(ctx: X, cam: Cam, f: number) {
  const [wx, wy] = p2w(600, 700);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  ctx.fillStyle = '#1A1A38'; ctx.beginPath();
  ctx.ellipse(sx, sy, 44 * z, 22 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4488FF'; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(sx, sy - 3 * z, 40 * z, 20 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#00DDCC'; ctx.lineWidth = 2.5 * z; ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.ellipse(sx, sy, 44 * z, 22 * z, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#1E1E40'; ctx.fillRect(sx - 3.5 * z, sy - 38 * z, 7 * z, 38 * z);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + f * 0.015;
    const d = 20 * z + Math.sin(f * 0.02 + i) * 3 * z;
    ctx.fillStyle = '#00DDCC'; ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(sx + Math.cos(a) * d, sy - 36 * z + Math.sin(a) * d * 0.35 + d * 0.15, 3 * z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 小商铺
function drawSmallShop(ctx: X, px: number, py: number, cam: Cam, f: number,
  hue: number, sat: number, color: string, name: string) {
  const [wx, wy] = p2w(px, py);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const hw = 65 * z, hd = 28 * z, bh = 95 * z;
  shadow(ctx, sx, sy, hw, hd);
  baseGlow(ctx, sx, sy, hw * 0.8, hd * 0.8, color);
  solidBox(ctx, sx, sy, hw, hd, bh, hue, sat, 19, 23, 28);
  floorLines(ctx, sx, sy, hw, hd, bh, 2, hue, z);
  brickTex(ctx, sx, sy, hw, hd, bh, color, z);
  drawWindows(ctx, sx, sy, hw, hd, bh, 2, 3, '#FFE088', z, px * 7 + py);
  neonTrim(ctx, sx, sy, hw, hd, bh, color, z);
  wallNeon(ctx, sx - hw + 2 * z, sy - bh + 8 * z, sy - 5 * z, color, z);
  door(ctx, sx, sy, hw, hd, z, color, 'L');
  awning(ctx, sx - hw * 0.38, sy - bh * 0.15, 22 * z, color, z);
  bigSign(ctx, sx, sy - bh - 20 * z, name, color, z * 0.9);
}

// 赛博树
function drawTree(ctx: X, px: number, py: number, cam: Cam, f: number, type: number) {
  const [wx, wy] = p2w(px, py);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 3 * z, 12 * z, 6 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222238'; ctx.fillRect(sx - 3 * z, sy - 38 * z, 6 * z, 41 * z);
  const gc = ['#00DDCC', '#9944FF', '#44FF66'][type % 3];
  for (const [a, r2] of [[0.06, 26], [0.22, 20], [0.28, 15], [0.35, 11]] as [number, number][]) {
    ctx.fillStyle = gc; ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(sx, sy - 48 * z, r2 * z, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.24;
  ctx.beginPath(); ctx.arc(sx - 5 * z, sy - 52 * z, 14 * z, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx + 5 * z, sy - 50 * z, 13 * z, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// 灯柱
function drawLamp(ctx: X, px: number, py: number, cam: Cam, f: number) {
  const [wx, wy] = p2w(px, py);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  ctx.fillStyle = '#222238'; ctx.fillRect(sx - 1.5 * z, sy - 32 * z, 3 * z, 35 * z);
  ctx.fillRect(sx, sy - 33 * z, 9 * z, 2 * z);
  ctx.fillStyle = '#1A1A30'; ctx.fillRect(sx + 6 * z, sy - 36 * z, 6 * z, 9 * z);
  const lc = (px * 3 + py * 7) % 2 === 0 ? '#00DDCC' : '#9944FF';
  const glow = 0.45 + Math.sin(f * 0.018 + px * 0.1) * 0.12;
  ctx.fillStyle = lc; ctx.globalAlpha = glow;
  ctx.fillRect(sx + 7 * z, sy - 35 * z, 4 * z, 7 * z);
  ctx.globalAlpha = glow * 0.07;
  ctx.beginPath(); ctx.ellipse(sx + 7 * z, sy + 2 * z, 22 * z, 11 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ==================================================================
//   角色 + 气泡
// ==================================================================
function drawChar(ctx: X, a: PlazaAgentState, cam: Cam, f: number, sel: boolean) {
  const [wx, wy] = p2w(a.x, a.y);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z;
  const clr = sClr(a.avatarSeed || a.walletAddress);
  const bounce = a.status === 'dancing' ? Math.sin(f * 0.12) * 3 * z : 0;
  const dy = -bounce;
  if (sel) { ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.ellipse(sx, sy + 2 * z, 14 * z, 7 * z, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2 * z, 8 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fill();
  const cw = 12 * z, ch = 26 * z;
  ctx.fillStyle = '#1A1A2A';
  ctx.fillRect(sx - cw * 0.35, sy - ch * 0.06 + dy, cw * 0.3, ch * 0.08);
  ctx.fillRect(sx + cw * 0.05, sy - ch * 0.06 + dy, cw * 0.3, ch * 0.08);
  ctx.fillStyle = clr;
  ctx.fillRect(sx - cw * 0.35, sy - ch * 0.5 + dy, cw * 0.7, ch * 0.44);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(sx - cw * 0.35, sy - ch * 0.5 + dy, cw * 0.2, ch * 0.44);
  ctx.fillStyle = '#EECBAD';
  ctx.fillRect(sx - cw * 0.27, sy - ch * 0.82 + dy, cw * 0.55, ch * 0.28);
  ctx.fillStyle = clr;
  ctx.fillRect(sx - cw * 0.3, sy - ch * 0.88 + dy, cw * 0.6, ch * 0.12);
  ctx.fillStyle = '#E8E8F0';
  ctx.fillRect(sx - cw * 0.12, sy - ch * 0.72 + dy, 2 * z, 2 * z);
  ctx.fillRect(sx + cw * 0.04, sy - ch * 0.72 + dy, 2 * z, 2 * z);
  ctx.save();
  ctx.font = `bold ${Math.max(6, 8 * z) | 0}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  const nm = a.aiName, tw = ctx.measureText(nm).width;
  ctx.fillStyle = 'rgba(8,8,20,0.75)';
  ctx.fillRect(sx - tw / 2 - 4, sy - ch - 10 * z + dy, tw + 8, 12 * z);
  ctx.strokeStyle = clr; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
  ctx.strokeRect(sx - tw / 2 - 4, sy - ch - 10 * z + dy, tw + 8, 12 * z);
  ctx.globalAlpha = 1; ctx.fillStyle = clr;
  ctx.fillText(nm, sx, sy - ch - 2 * z + dy);
  ctx.restore();
}

function drawBubble(ctx: X, a: PlazaAgentState, cam: Cam) {
  if (!a.chatBubble || !a.chatBubbleExpiry || Date.now() > a.chatBubbleExpiry) return;
  const [wx, wy] = p2w(a.x, a.y);
  const [sx, sy] = w2v(wx, wy, cam);
  const z = cam.z; if (z < 0.4) return;
  const text = a.chatBubble.length > 18 ? a.chatBubble.slice(0, 18) + '..' : a.chatBubble;
  ctx.font = `${Math.max(6, 8 * z) | 0}px "Press Start 2P", monospace`;
  const tw = ctx.measureText(text).width;
  const bw = tw + 14 * z, bh2 = 18 * z;
  const bx = sx - bw / 2, by = sy - 65 * z;
  ctx.fillStyle = 'rgba(8,8,20,0.9)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh2, 4 * z); ctx.fill();
  ctx.strokeStyle = sClr(a.avatarSeed || a.walletAddress); ctx.lineWidth = 1 * z; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8,8,20,0.9)'; ctx.beginPath();
  ctx.moveTo(sx - 3 * z, by + bh2); ctx.lineTo(sx, by + bh2 + 5 * z); ctx.lineTo(sx + 3 * z, by + bh2); ctx.fill();
  ctx.fillStyle = '#E8E8F0'; ctx.textAlign = 'center';
  ctx.fillText(text, sx, by + bh2 / 2 + 3 * z);
}

// ==================================================================
//   大气 + 后处理
// ==================================================================
function drawParticles(ctx: X, cam: Cam, f: number) {
  const z = cam.z;
  const colors = ['#00DDCC', '#9944FF', '#FF44AA', '#44FF66', '#FFD700', '#4488FF'];
  for (let i = 0; i < 25; i++) {
    const bc = sr(i, 0, 555) * COLS, br = sr(i, 1, 555) * ROWS;
    const [wx, wy] = iso(bc, br);
    const lifeT = (f * 0.08 + i * 41) % 180;
    const [vx, vy] = w2v(wx + Math.sin(f * 0.005 + i * 2.1) * 20, wy - lifeT, cam);
    if (vx < 0 || vx > CW || vy < 0 || vy > CH) continue;
    ctx.fillStyle = colors[i % 6]; ctx.globalAlpha = (1 - lifeT / 180) * 0.15;
    ctx.beginPath(); ctx.arc(vx, vy, (2 + lifeT / 180 * 3) * z, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPost(ctx: X) {
  ctx.fillStyle = 'rgba(15,8,30,0.04)'; ctx.fillRect(0, 0, CW, CH);
  const vg = ctx.createRadialGradient(CW / 2, CH / 2, CW * 0.28, CW / 2, CH / 2, CW * 0.72);
  vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,8,0.18)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = 'rgba(0,0,0,0.012)';
  for (let y = 0; y < CH; y += 3) ctx.fillRect(0, y, CW, 1);
}

// ==================================================================
//   主组件
// ==================================================================
interface Props {
  agents: Record<string, PlazaAgentState>;
  djState: DJLiveState | null;
  messages: TransientMessage[];
  displayWidth: number; displayHeight: number;
  selectedAgent: string | null;
  onAgentClick: (w: string) => void;
}

export default function PlazaCanvas({ agents, djState, displayWidth, displayHeight, selectedAgent, onAgentClick }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const camR = useRef<Cam>(mkCam());
  const keys = useRef<Set<string>>(new Set());
  const fRef = useRef(0);
  const aRef = useRef(0);

  useEffect(() => { camR.current = mkCam(); }, []);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'r') camR.current = mkCam();
    };
    const ku = (e: KeyboardEvent) => { keys.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);
  useEffect(() => {
    const el = cvs.current; if (!el) return;
    const onW = (e: WheelEvent) => {
      e.preventDefault();
      camR.current.tz = Math.max(0.3, Math.min(2.5, camR.current.tz - e.deltaY * 0.001));
    };
    el.addEventListener('wheel', onW, { passive: false });
    return () => el.removeEventListener('wheel', onW);
  }, []);

  const onClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const el = cvs.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * CW / rect.width, my = (e.clientY - rect.top) * CH / rect.height;
    const cam = camR.current;
    let best: string | null = null, bestD = 30 * cam.z;
    for (const a of Object.values(agents)) {
      const [wx2, wy2] = p2w(a.x, a.y);
      const [vx, vy] = w2v(wx2, wy2, cam);
      const d = Math.hypot(mx - vx, my - vy);
      if (d < bestD) { bestD = d; best = a.walletAddress; }
    }
    if (best) onAgentClick(best);
  }, [agents, onAgentClick]);

  useEffect(() => {
    const el = cvs.current; if (!el) return;
    const ctx = el.getContext('2d'); if (!ctx) return;

    const loop = () => {
      const f = fRef.current++;
      const cam = camR.current;
      const k = keys.current;
      const spd = 5 / cam.z;
      if (k.has('w') || k.has('arrowup')) cam.ty -= spd;
      if (k.has('s') || k.has('arrowdown')) cam.ty += spd;
      if (k.has('a') || k.has('arrowleft')) cam.tx -= spd;
      if (k.has('d') || k.has('arrowright')) cam.tx += spd;
      cam.x += (cam.tx - cam.x) * 0.1;
      cam.y += (cam.ty - cam.y) * 0.1;
      cam.z += (cam.tz - cam.z) * 0.1;

      ctx.clearRect(0, 0, CW, CH);

      // ① 背景一体化渲染（天空+地面+瓷砖）
      drawBackground(ctx, cam, f);

      // ② 深度排序的物体
      const objs: { wy: number; fn: () => void }[] = [];

      objs.push({ wy: p2w(180, 220)[1], fn: () => drawLibrary(ctx, cam, f) });
      objs.push({ wy: p2w(460, 180)[1], fn: () => drawPsychShop(ctx, cam, f) });
      objs.push({ wy: p2w(1020, 200)[1], fn: () => drawAltar(ctx, cam, f) });
      objs.push({ wy: p2w(1040, 550)[1], fn: () => drawRestArea(ctx, cam, f) });
      objs.push({ wy: p2w(160, 550)[1], fn: () => drawHallOfFame(ctx, cam, f) });
      objs.push({ wy: p2w(600, 420)[1], fn: () => drawDJ(ctx, cam, f, djState?.isLive ?? false) });
      objs.push({ wy: p2w(600, 700)[1], fn: () => drawFountain(ctx, cam, f) });
      objs.push({ wy: p2w(340, 380)[1], fn: () => drawTower(ctx, cam, f, 340, 380, 275, '#9944FF') });
      objs.push({ wy: p2w(860, 380)[1], fn: () => drawTower(ctx, cam, f, 860, 380, 180, '#00DDCC') });
      objs.push({ wy: p2w(300, 100)[1], fn: () => drawSmallShop(ctx, 300, 100, cam, f, 25, 35, '#FF8844', 'CAFE') });
      objs.push({ wy: p2w(780, 110)[1], fn: () => drawSmallShop(ctx, 780, 110, cam, f, 330, 35, '#FF44AA', 'RAMEN') });
      objs.push({ wy: p2w(200, 380)[1], fn: () => drawSmallShop(ctx, 200, 380, cam, f, 140, 30, '#44FF66', 'HERBS') });
      objs.push({ wy: p2w(1000, 380)[1], fn: () => drawSmallShop(ctx, 1000, 380, cam, f, 220, 30, '#4488FF', 'ARCADE') });
      objs.push({ wy: p2w(480, 660)[1], fn: () => drawSmallShop(ctx, 480, 660, cam, f, 180, 30, '#00DDCC', 'NEON') });
      objs.push({ wy: p2w(760, 660)[1], fn: () => drawSmallShop(ctx, 760, 660, cam, f, 350, 35, '#FF2244', 'VINYL') });

      const trees: [number, number, number][] = [
        [80, 150, 0], [1120, 150, 1], [80, 480, 2], [1120, 480, 0],
        [80, 700, 1], [1120, 700, 2], [420, 560, 0], [780, 560, 1],
        [300, 280, 2], [900, 280, 0], [550, 130, 1], [660, 760, 2],
      ];
      for (const [tx, ty, tt] of trees) objs.push({ wy: p2w(tx, ty)[1], fn: () => drawTree(ctx, tx, ty, cam, f, tt) });

      const lamps: [number, number][] = [
        [380, 240], [820, 240], [380, 540], [820, 540],
        [500, 320], [700, 320], [500, 520], [700, 520],
        [260, 620], [940, 620], [460, 100], [740, 100],
      ];
      for (const [lx, ly] of lamps) objs.push({ wy: p2w(lx, ly)[1], fn: () => drawLamp(ctx, lx, ly, cam, f) });

      for (const a of Object.values(agents)) {
        const [, awy] = p2w(a.x, a.y);
        objs.push({ wy: awy, fn: () => { drawChar(ctx, a, cam, f, a.walletAddress === selectedAgent); drawBubble(ctx, a, cam); } });
      }

      objs.sort((a, b) => a.wy - b.wy);
      for (const o of objs) o.fn();

      // ③ 后处理
      drawParticles(ctx, cam, f);
      drawPost(ctx);

      aRef.current = requestAnimationFrame(loop);
    };

    aRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(aRef.current);
  }, [agents, djState, selectedAgent]);

  return (
    <canvas ref={cvs} width={CW} height={CH} onClick={onClick}
      style={{ width: displayWidth, height: displayHeight, imageRendering: 'pixelated', cursor: 'pointer' }} />
  );
}
