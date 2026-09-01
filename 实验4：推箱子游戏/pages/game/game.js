// pages/game/game.js
const data = require('../../utils/data.js')

// 地图尺寸
const ROW = 8
const COL = 8

// 需要预加载的素材（地板改为 canvas 自绘草地，不再使用 ice.png）
const IMG_NAMES = ['stone', 'pig', 'bird']

// 画布配色
const COLOR = {
  grassA: '#BFE08A', // 浅草
  grassB: '#B0D87B', // 深草（棋盘交错）
  nest: '#4E8C2A', // 草窝（终点）
  nestFill: 'rgba(78, 140, 42, 0.14)',
  gold: '#FFC107', // 归位金边
  boardBg: '#FFFFFF'
}

let ctx = null
let canvasNode = null
let cell = 40
const imgCache = {}

/**
 * 画圆角矩形路径（不依赖 ctx.roundRect，兼容低版本基础库）
 */
function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + rr, y)
  c.arcTo(x + w, y, x + w, y + h, rr)
  c.arcTo(x + w, y + h, x, y + h, rr)
  c.arcTo(x, y + h, x, y, rr)
  c.arcTo(x, y, x + w, y, rr)
  c.closePath()
}

/**
 * 在圆角矩形内裁剪绘制图片，让像素素材呈现贴纸质感
 */
function drawRoundImage(c, img, x, y, w, h, r) {
  c.save()
  roundRectPath(c, x, y, w, h, r)
  c.clip()
  c.drawImage(img, x, y, w, h)
  c.restore()
}

/**
 * 画一个 V 形对勾
 */
function drawCheck(c, cx, cy, size, color, width) {
  c.save()
  c.strokeStyle = color
  c.lineWidth = width
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  c.moveTo(cx - size, cy)
  c.lineTo(cx - size * 0.3, cy + size * 0.62)
  c.lineTo(cx + size, cy - size * 0.62)
  c.stroke()
  c.restore()
}

Page({
  data: {
    levelNum: 1, // 当前关卡编号
    steps: 0, // 当前步数
    boxTotal: 0, // 小猪总数
    boxDone: 0, // 已归位数量
    best: 0, // 本关历史最佳步数
    bestStarText: '', // 历史星级
    showWin: false, // 通关弹窗
    starText: '', // 本次星级
    isNewRecord: false, // 是否刷新纪录
    nextStarTip: '', // 升星提示
    snapshot: '', // 通关瞬间棋盘截图（用 image 取代 canvas，彻底规避层级遮挡）
    boardReady: false // 首帧完整绘制后再显示棋盘，避免分层闪现
  },

  // 非响应式状态
  map: [],
  box: [],
  row: 0,
  col: 0,
  history: [],
  isWin: false,
  imagesReady: false,
  level: 'level01',
  startX: 0,
  startY: 0,
  animBox: null, // 归位动效 { r, c, progress }
  animating: false,

  onLoad(options) {
    const requestedLevel = options.level || 'level01'
    const level = data.maps[requestedLevel] ? requestedLevel : 'level01'
    const num = parseInt(String(level).replace('level', ''), 10) || 1
    this.level = level
    this.setData({ levelNum: num })
    this.refreshBest()
    this.initMap(level)
  },

  onReady() {
    this.initCanvas()
  },

  /** 读取本关历史最佳 */
  refreshBest() {
    const best = data.getBest()[this.level] || 0
    this.setData({
      best: best,
      bestStarText: best ? data.starText(data.getStars(this.level, best)) : ''
    })
  },

  /** 初始化关卡 */
  initMap(level) {
    const lv = data.maps[level] || data.maps['level01']
    this.map = lv.map.map((r) => r.slice())
    this.box = lv.box.map((r) => r.slice())
    // 找到玩家起点 5，清成路 2
    this.row = 0
    this.col = 0
    for (let r = 0; r < ROW; r++) {
      for (let c = 0; c < COL; c++) {
        if (this.map[r][c] === 5) {
          this.row = r
          this.col = c
          this.map[r][c] = 2
        }
      }
    }
    this.history = []
    this.isWin = false
    this.animBox = null
    this.setData({
      steps: 0,
      boxTotal: this.countBox(),
      boxDone: this.countDone(),
      showWin: false,
      starText: '',
      isNewRecord: false,
      nextStarTip: '',
      snapshot: ''
    })
  },

  /** 初始化 canvas（含 DPR 适配） */
  initCanvas() {
    const query = wx.createSelectorQuery()
    query
      .select('#myCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        canvasNode = res[0].node
        ctx = canvasNode.getContext('2d')
        const sysInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const dpr = sysInfo.pixelRatio || 2
        canvasNode.width = res[0].width * dpr
        canvasNode.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        cell = res[0].width / COL
        this.loadImages()
      })
  },

  /** 预加载素材 */
  loadImages() {
    let loaded = 0
    const total = IMG_NAMES.length
    IMG_NAMES.forEach((name) => {
      const img = canvasNode.createImage()
      img.onload = () => {
        loaded++
        if (loaded >= total) {
          this.imagesReady = true
          this.drawCanvas()
          const reveal = () => this.setData({ boardReady: true })
          if (canvasNode.requestAnimationFrame) {
            canvasNode.requestAnimationFrame(reveal)
          } else {
            reveal()
          }
        }
      }
      img.src = '/images/icons/' + name + '.png'
      imgCache[name] = img
    })
  },

  /**
   * 绘制棋盘
   * 图层顺序：底色 -> 格子(草地/石头) -> 草窝 -> 小猪 -> 归位动效 -> 小鸟
   */
  drawCanvas() {
    if (!ctx || !this.imagesReady) return
    const w = cell * COL
    const h = cell * ROW
    ctx.clearRect(0, 0, w, h)

    const gap = cell * 0.045 // 格间留缝
    const s = cell - gap * 2 // 图形边长
    const rad = s * 0.2 // 圆角半径

    for (let r = 0; r < ROW; r++) {
      for (let c = 0; c < COL; c++) {
        const v = this.map[r][c]
        if (v === 0) continue

        const x = c * cell + gap
        const y = r * cell + gap

        // 墙：石头素材圆角裁剪
        if (v === 1) {
          drawRoundImage(ctx, imgCache.stone, x, y, s, s, rad)
          continue
        }

        // 地板：棋盘交错草地色
        roundRectPath(ctx, x, y, s, s, rad)
        ctx.fillStyle = (r + c) % 2 === 0 ? COLOR.grassA : COLOR.grassB
        ctx.fill()

        // 终点：草窝（虚线圆 + 淡填充）
        if (v === 3) {
          const cx = x + s / 2
          const cy = y + s / 2
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, s * 0.31, 0, Math.PI * 2)
          ctx.fillStyle = COLOR.nestFill
          ctx.fill()
          ctx.strokeStyle = COLOR.nest
          ctx.lineWidth = Math.max(1.5, s * 0.05)
          ctx.setLineDash([s * 0.11, s * 0.08])
          ctx.stroke()
          ctx.restore()
        }

        // 小猪
        if (this.box[r][c] === 4) {
          drawRoundImage(ctx, imgCache.pig, x, y, s, s, rad)
          // 已归位：金色描边 + 对勾
          if (v === 3) {
            ctx.save()
            roundRectPath(ctx, x, y, s, s, rad)
            ctx.strokeStyle = COLOR.gold
            ctx.lineWidth = Math.max(2, s * 0.07)
            ctx.stroke()
            ctx.restore()
            drawCheck(
              ctx,
              x + s * 0.78,
              y + s * 0.24,
              s * 0.09,
              COLOR.gold,
              Math.max(2, s * 0.06)
            )
          }
        }

        // 归位瞬间：金色光环扩散
        if (this.animBox && this.animBox.r === r && this.animBox.c === c) {
          const p = this.animBox.progress || 0
          ctx.save()
          ctx.globalAlpha = 1 - p
          ctx.strokeStyle = COLOR.gold
          ctx.lineWidth = Math.max(2, s * 0.1 * (1 - p))
          ctx.beginPath()
          ctx.arc(x + s / 2, y + s / 2, s * 0.38 + p * s * 0.55, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    // 玩家：小鸟
    const px = this.col * cell + gap
    const py = this.row * cell + gap
    drawRoundImage(ctx, imgCache.bird, px, py, s, s, rad)
  },

  /** 格子是否可站立 */
  isWalkable(r, c) {
    if (r < 0 || r >= ROW || c < 0 || c >= COL) return false
    return this.map[r][c] !== 0 && this.map[r][c] !== 1
  },

  /** 当前已归位箱子集合（字符串便于比较） */
  doneSet() {
    const set = new Set()
    for (let r = 0; r < ROW; r++) {
      for (let c = 0; c < COL; c++) {
        if (this.box[r][c] === 4 && this.map[r][c] === 3) {
          set.add(r + ',' + c)
        }
      }
    }
    return set
  },

  /** 移动 */
  move(dr, dc) {
    if (this.isWin) return
    const nr = this.row + dr
    const nc = this.col + dc
    if (!this.isWalkable(nr, nc)) return

    // 必须在移动箱子前记录，否则新归位的位置会被误认为原本已归位。
    const before = this.doneSet()

    if (this.box[nr][nc] === 4) {
      // 前方是小猪，尝试推动
      const br = nr + dr
      const bc = nc + dc
      if (!this.isWalkable(br, bc) || this.box[br][bc] === 4) return
      this.saveHistory()
      this.box[nr][nc] = 0
      this.box[br][bc] = 4
    } else {
      this.saveHistory()
    }

    this.row = nr
    this.col = nc
    this.setData({
      steps: this.data.steps + 1,
      boxDone: this.countDone()
    })
    this.drawCanvas()

    // 找出本步新归位的小猪
    const after = this.doneSet()
    after.forEach((key) => {
      if (before.has(key)) return
      const parts = key.split(',')
      this.playInAnim(parseInt(parts[0], 10), parseInt(parts[1], 10))
    })

    this.checkWin()
  },

  /** 归位动效：金环扩散 + 轻震动 */
  playInAnim(r, c) {
    if (!canvasNode || !canvasNode.requestAnimationFrame) return
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' })
    }
    const start = Date.now()
    this.animBox = { r: r, c: c, progress: 0 }
    if (this.animating) return
    this.animating = true

    const step = () => {
      if (!this.animBox) {
        this.animating = false
        this.drawCanvas()
        return
      }
      const t = (Date.now() - start) / 480
      if (t >= 1) {
        this.animBox = null
        this.animating = false
        this.drawCanvas()
        return
      }
      this.animBox.progress = t
      this.drawCanvas()
      canvasNode.requestAnimationFrame(step)
    }
    canvasNode.requestAnimationFrame(step)
  },

  /** 保存一步历史 */
  saveHistory() {
    this.history.push({
      row: this.row,
      col: this.col,
      box: this.box.map((r) => r.slice())
    })
    if (this.history.length > 200) this.history.shift()
  },

  countBox() {
    let n = 0
    for (let r = 0; r < ROW; r++) {
      for (let c = 0; c < COL; c++) {
        if (this.box[r][c] === 4) n++
      }
    }
    return n
  },

  countDone() {
    let n = 0
    for (let r = 0; r < ROW; r++) {
      for (let c = 0; c < COL; c++) {
        if (this.box[r][c] === 4 && this.map[r][c] === 3) n++
      }
    }
    return n
  },

  /** 判定通关并处理成绩 */
  checkWin() {
    if (this.countDone() !== this.data.boxTotal || this.data.boxTotal === 0) return

    this.isWin = true
    const steps = this.data.steps
    const isNewRecord = data.saveBest(this.level, steps)
    const stars = data.getStars(this.level, steps)
    const gap = data.stepsToNextStar(this.level, steps)

    this.refreshBest()

    // 关键：先把当前帧导出成图片，再用 image 显示棋盘，彻底消除 canvas 遮挡弹窗
    this.snapshotBoard(() => {
      this.setData({
        showWin: true,
        starText: data.starText(stars),
        isNewRecord: isNewRecord,
        nextStarTip: gap > 0 ? '再少 ' + gap + ' 步可得 ' + (stars + 1) + ' 星' : ''
      })
    })

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'medium' })
    }
  },

  /**
   * 导出当前棋盘为临时图片路径，setData snapshot 触发 wxml 切换 canvas → image
   */
  snapshotBoard(cb) {
    if (!canvasNode) {
      // 兜底：canvas 还没初始化，直接显示弹窗
      typeof cb === 'function' && cb()
      return
    }
    wx.canvasToTempFilePath(
      {
        canvas: canvasNode,
        fileType: 'png',
        success: (res) => {
          this.setData({ snapshot: res.tempFilePath }, () => {
            typeof cb === 'function' && cb()
          })
        },
        fail: () => {
          // 导出失败也要显示弹窗（让 z-index 兜底生效）
          typeof cb === 'function' && cb()
        }
      },
      this
    )
  },

  // 四个方向
  up() { this.move(-1, 0) },
  down() { this.move(1, 0) },
  left() { this.move(0, -1) },
  right() { this.move(0, 1) },

  /** 撤销一步 */
  undo() {
    if (this.isWin) return
    if (this.history.length === 0) {
      wx.showToast({ title: '没有可撤销的步骤', icon: 'none' })
      return
    }
    const last = this.history.pop()
    this.row = last.row
    this.col = last.col
    this.box = last.box
    this.setData({
      steps: this.data.steps > 0 ? this.data.steps - 1 : 0,
      boxDone: this.countDone()
    })
    this.drawCanvas()
  },

  /** 重玩本关 */
  restartGame() {
    this.initMap(this.level)
    // 清空快照让 image 消失，canvas 重新可见后直接重绘（canvasNode/ctx 始终有效）
    this.setData({ snapshot: '' })
    this.drawCanvas()
  },

  /** 返回选关 */
  goLevels() {
    this.setData({ snapshot: '' })
    wx.navigateBack()
  },

  /** 下一关（最后一关则返回选关） */
  nextLevel() {
    const next = this.data.levelNum + 1
    this.setData({ snapshot: '' })
    if (next > 4) {
      this.setData({ showWin: false })
      wx.navigateBack()
      wx.showToast({ title: '全部关卡已通关', icon: 'none' })
      return
    }
    this.level = 'level0' + next
    this.setData({ levelNum: next })
    this.refreshBest()
    this.initMap(this.level)
    this.drawCanvas()
  },

  /** 弹窗打开时阻止触摸穿透到棋盘 */
  stopEvent() {},

  /** 滑动手势起点 */
  touchStart(e) {
    this.startX = e.touches[0].clientX
    this.startY = e.touches[0].clientY
  },

  /** 滑动手势终点 */
  touchEnd(e) {
    const dx = e.changedTouches[0].clientX - this.startX
    const dy = e.changedTouches[0].clientY - this.startY
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) this.move(0, 1)
      else this.move(0, -1)
    } else {
      if (dy > 0) this.move(1, 0)
      else this.move(-1, 0)
    }
  }
})
