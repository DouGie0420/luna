/**
 * ============================================================
 * 等距渲染引擎 v2.5D
 * ============================================================
 * 真正的《星露谷物语》风格等距投影系统
 * 支持高度系统、深度排序、相机透视
 */

export class IsometricEngine {
  // 等距投影常数（30度视角）
  private cos30 = Math.cos(Math.PI / 6); // 0.8660254037844386
  private sin30 = Math.sin(Math.PI / 6); // 0.5

  // 瓦片尺寸配置
  public tileSize: number = 48;      // 等距菱形宽度
  public tileHeight: number = 24;    // 等距菱形高度（tileSize / 2）

  // 相机配置
  public cameraX: number = 0;
  public cameraY: number = 0;
  public cameraZ: number = 0;        // 相机高度（用于透视）
  public zoom: number = 1.2;         // 基础缩放

  // 光源配置
  public lightDirection = { x: -0.7, y: -0.5, z: -0.5 };
  public ambientLight = 0.3;
  public diffuseLight = 0.7;

  constructor(config?: Partial<{
    tileSize: number;
    tileHeight: number;
    cameraX: number;
    cameraY: number;
    cameraZ: number;
    zoom: number;
  }>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  /**
   * 等距投影：世界坐标 → 屏幕坐标
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param worldZ 世界Z坐标（高度）
   * @returns 屏幕坐标 {x, y}
   */
  worldToScreen(worldX: number, worldY: number, worldZ: number = 0) {
    // 应用相机偏移和缩放
    const worldXTransformed = (worldX - this.cameraX) * this.zoom;
    const worldYTransformed = (worldY - this.cameraY) * this.zoom;
    const worldZTransformed = (worldZ - this.cameraZ) * this.zoom;

    // 等距投影公式
    const screenX = (worldXTransformed - worldYTransformed) * this.cos30;
    const screenY = (worldXTransformed + worldYTransformed) * this.sin30 - worldZTransformed;

    return { x: screenX, y: screenY };
  }

  /**
   * 反向投影：屏幕坐标 → 世界坐标
   * @param screenX 屏幕X坐标
   * @param screenY 屏幕Y坐标
   * @param screenZ 屏幕Z坐标（高度）
   * @returns 世界坐标 {x, y, z}
   */
  screenToWorld(screenX: number, screenY: number, screenZ: number = 0) {
    // 反向等距投影公式
    const worldX = (screenX / this.cos30 + screenY / this.sin30) / (2 * this.zoom) + this.cameraX;
    const worldY = (screenY / this.sin30 - screenX / this.cos30) / (2 * this.zoom) + this.cameraY;
    const worldZ = screenZ / this.zoom + this.cameraZ;

    return { x: worldX, y: worldY, z: worldZ };
  }

  /**
   * 深度计算（用于排序和透视）
   * 关键公式：worldY + worldZ * 0.6
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param worldZ 世界Z坐标（高度）
   * @returns 深度值（越大越靠后）
   */
  calculateDepth(worldX: number, worldY: number, worldZ: number = 0): number {
    return worldY + worldZ * 0.6;
  }

  /**
   * 计算光照强度（用于瓦片渐变）
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param worldZ 世界Z坐标（高度）
   * @returns 光照强度（0.0-1.0）
   */
  calculateLightIntensity(worldX: number, worldY: number, worldZ: number = 0): number {
    // 法向量（垂直向上）
    const normalX = 0;
    const normalY = 0;
    const normalZ = 1;

    // 点积计算光照
    const dotProduct =
      normalX * this.lightDirection.x +
      normalY * this.lightDirection.y +
      normalZ * this.lightDirection.z;

    // 计算最终光照强度
    const lightIntensity =
      this.ambientLight +
      this.diffuseLight * Math.max(0, dotProduct);

    return Math.min(1.0, Math.max(0.1, lightIntensity));
  }

  /**
   * 创建等距瓦片渐变（左上亮，右下暗）
   * @param ctx Canvas上下文
   * @param screenX 屏幕X坐标（瓦片中心）
   * @param screenY 屏幕Y坐标（瓦片中心）
   * @param baseColor 基础颜色（RGB对象）
   * @returns CanvasGradient对象
   */
  createIsometricGradient(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    baseColor: { r: number; g: number; b: number }
  ): CanvasGradient {
    const gradient = ctx.createLinearGradient(
      screenX - this.tileSize / 2, screenY - this.tileHeight,
      screenX + this.tileSize / 2, screenY + this.tileHeight
    );

    // 左上角高光（光源方向）
    const highlightFactor = 1.2;
    gradient.addColorStop(0, `rgba(
      ${Math.min(255, baseColor.r * highlightFactor)},
      ${Math.min(255, baseColor.g * highlightFactor)},
      ${Math.min(255, baseColor.b * highlightFactor)},
      0.9)`);

    // 中心区域（基础颜色）
    gradient.addColorStop(0.5, `rgba(
      ${baseColor.r},
      ${baseColor.g},
      ${baseColor.b},
      0.85)`);

    // 右下角阴影
    const shadowFactor = 0.7;
    gradient.addColorStop(1, `rgba(
      ${baseColor.r * shadowFactor},
      ${baseColor.g * shadowFactor},
      ${baseColor.b * shadowFactor},
      0.8)`);

    return gradient;
  }

  /**
   * 绘制等距菱形瓦片
   * @param ctx Canvas上下文
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param worldZ 世界Z坐标（高度）
   * @param color 瓦片颜色
   * @param canvasWidth 画布宽度（用于中心偏移）
   * @param canvasHeight 画布高度（用于中心偏移）
   */
  drawIsometricTile(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number = 0,
    color: { r: number; g: number; b: number },
    canvasWidth: number,
    canvasHeight: number
  ) {
    const screenPos = this.worldToScreen(worldX, worldY, worldZ);
    const screenX = canvasWidth / 2 + screenPos.x;
    const screenY = canvasHeight / 2 + screenPos.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    // 绘制等距菱形
    ctx.beginPath();
    ctx.moveTo(0, -this.tileHeight);           // 上顶点
    ctx.lineTo(this.tileSize / 2, 0);          // 右顶点
    ctx.lineTo(0, this.tileHeight);            // 下顶点
    ctx.lineTo(-this.tileSize / 2, 0);         // 左顶点
    ctx.closePath();

    // 应用渐变填充
    const gradient = this.createIsometricGradient(ctx, 0, 0, color);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 微弱的边框（增强立体感）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 高光效果（左上角亮化）
    const highlightGradient = ctx.createLinearGradient(
      -this.tileSize / 4, -this.tileHeight / 2,
      this.tileSize / 4, this.tileHeight / 2
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    ctx.restore();
  }

  /**
   * 投射阴影（随高度变化的椭圆阴影）
   * @param ctx Canvas上下文
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @param worldZ 世界Z坐标（高度）
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   */
  drawDropShadow(
    ctx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    worldZ: number = 0,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const screenPos = this.worldToScreen(worldX, worldY, 0); // 阴影在地面
    const screenX = canvasWidth / 2 + screenPos.x;
    const screenY = canvasHeight / 2 + screenPos.y;

    // 阴影随高度变化：越高越模糊、越拉长
    const shadowHeight = worldZ * 0.3;  // 高度每增加1单位，阴影拉长0.3
    const blur = worldZ * 0.8;          // 越高阴影越模糊

    ctx.save();

    // 创建径向渐变阴影
    const gradient = ctx.createRadialGradient(
      screenX, screenY,
      0,
      screenX, screenY,
      16 + shadowHeight * 5
    );

    // 阴影透明度随高度变化
    const shadowAlpha = Math.max(0.05, 0.25 - worldZ * 0.05);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;

    // 椭圆阴影形状（根据高度变化）
    ctx.beginPath();
    ctx.ellipse(
      screenX, screenY + 8,                // 位置（略低于物体）
      12 + shadowHeight * 2,              // 水平半径
      4 + shadowHeight * 0.5,             // 垂直半径（随高度变化）
      0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  /**
   * 获取区域高度（高度系统）
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @returns 高度值（单位）
   */
  getRegionHeight(worldX: number, worldY: number): number {
    // 高度映射：不同区域不同高度
    const heightMap = {
      'central_plaza': 4,     // 中央广场高4单位
      'dj_stage': 3,          // DJ舞台高3单位
      'drug_shop': 2,         // 商店高2单位
      'default': 0           // 默认高度
    };

    // 简单区域检测（基于世界坐标）
    const regionType = this.determineRegion(worldX, worldY);
    return heightMap[regionType as keyof typeof heightMap] || heightMap.default;
  }

  /**
   * 确定坐标所在区域类型
   * @param worldX 世界X坐标
   * @param worldY 世界Y坐标
   * @returns 区域类型字符串
   */
  determineRegion(worldX: number, worldY: number): string {
    // 简化版本：基于坐标范围判断
    // 在实际应用中，这应该与广场区域配置（PLAZA_ZONES）同步
    const x = worldX;
    const y = worldY;

    // 中央广场区域（半径约30单位）
    if (Math.abs(x) < 30 && Math.abs(y) < 30) {
      return 'central_plaza';
    }

    // DJ舞台区域（右上角）
    if (x > 15 && x < 45 && y > -45 && y < -15) {
      return 'dj_stage';
    }

    // 电子毒品区（左下角）
    if (x > -45 && x < -15 && y > 15 && y < 45) {
      return 'drug_shop';
    }

    return 'default';
  }

  /**
   * 更新相机位置（平滑跟随）
   * @param targetX 目标X坐标
   * @param targetY 目标Y坐标
   * @param dt 时间增量（秒）
   */
  updateCamera(targetX: number, targetY: number, dt: number) {
    const followSmoothness = 0.1;
    this.cameraX += (targetX - this.cameraX) * followSmoothness * dt * 60;
    this.cameraY += (targetY - this.cameraY) * followSmoothness * dt * 60;

    // 轻微高度倾斜（创造景深效果）
    const tiltFactor = 1.0 + (this.cameraY * 0.001);
    const perspectiveFactor = 1.0 + (Math.abs(this.cameraY) * 0.0002);

    return {
      x: this.cameraX * perspectiveFactor,
      y: this.cameraY * tiltFactor,
      z: this.cameraZ
    };
  }
}