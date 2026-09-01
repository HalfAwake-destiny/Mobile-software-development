// utils/data.js
// 地图图层：0=空(不绘制,不可通行) 1=墙 2=路 3=终点 5=玩家初始位置(初始化后清成路)
// 箱子图层：0=无 4=箱子（小猪）
// 全部关卡已通过 BFS 求解器验证可解，optimal 为最少步数（星级评定基准）

const maps = {
  level01: {
    map: [
      [0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 5, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 1, 1, 2, 1, 2, 1, 1],
      [1, 3, 1, 2, 1, 2, 2, 1],
      [1, 3, 2, 2, 2, 1, 2, 1],
      [1, 3, 2, 2, 2, 2, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ],
    box: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 4, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 4, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 4, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  },

  level02: {
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 3, 3, 3, 2, 2, 1, 1],
      [1, 2, 2, 2, 2, 2, 1, 1],
      [1, 2, 2, 2, 2, 2, 1, 1],
      [1, 2, 2, 2, 2, 2, 1, 1],
      [1, 2, 2, 5, 2, 2, 1, 1],
      [1, 2, 2, 2, 2, 2, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1]
    ],
    box: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 4, 4, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  },

  level03: {
    map: [
      [1, 1, 1, 1, 1, 0, 0, 0],
      [1, 3, 3, 3, 1, 0, 0, 0],
      [1, 2, 2, 2, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 5, 2, 2, 2, 1, 0],
      [1, 1, 2, 2, 2, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 0]
    ],
    box: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 4, 0, 4, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  },

  level04: {
    map: [
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 3, 3, 3, 3, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 5, 2, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 0]
    ],
    box: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 4, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 4, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ]
  }
}

// 每关最少步数（BFS 求得），用于星级评定
const optimal = {
  level01: 42,
  level02: 19,
  level03: 22,
  level04: 25
}

// 本地存储键名：每关最佳步数
const BEST_KEY = 'sokoban_best'

/**
 * 读取全部关卡的最佳步数
 */
function getBest() {
  try {
    return wx.getStorageSync(BEST_KEY) || {}
  } catch (e) {
    return {}
  }
}

/**
 * 写入某关的最佳步数，返回是否刷新纪录
 */
function saveBest(level, steps) {
  const best = getBest()
  const prev = best[level]
  if (prev && prev <= steps) {
    return false
  }
  best[level] = steps
  try {
    wx.setStorageSync(BEST_KEY, best)
  } catch (e) {
    // 存储失败不影响游戏
  }
  return true
}

/**
 * 根据步数评定星级（1~3 星）
 * 不超过最优 1.3 倍 -> 三星；不超过最优 1.8 倍 -> 二星；否则一星
 * 注意：用浮点直接比较，不取整，避免边界被放宽一格
 */
function getStars(level, steps) {
  const opt = optimal[level]
  if (!opt || !steps || steps <= 0) {
    return 0
  }
  if (steps <= opt * 1.3) {
    return 3
  }
  if (steps <= opt * 1.8) {
    return 2
  }
  return 1
}

/**
 * 距离下一星还差多少步（已是三星则返回 0）
 */
function stepsToNextStar(level, steps) {
  const opt = optimal[level]
  if (!opt || !steps || steps <= 0) {
    return 0
  }
  if (steps <= opt * 1.3) {
    return 0
  }
  if (steps <= opt * 1.8) {
    return steps - Math.floor(opt * 1.3)
  }
  return steps - Math.floor(opt * 1.8)
}

/**
 * 生成星级字符串，如 ★★★ / ★★☆ / ☆☆☆
 */
function starText(stars) {
  let s = ''
  for (let i = 0; i < 3; i++) {
    s += i < stars ? '★' : '☆'
  }
  return s
}

module.exports = {
  maps: maps,
  optimal: optimal,
  BEST_KEY: BEST_KEY,
  getBest: getBest,
  saveBest: saveBest,
  getStars: getStars,
  stepsToNextStar: stepsToNextStar,
  starText: starText
}
