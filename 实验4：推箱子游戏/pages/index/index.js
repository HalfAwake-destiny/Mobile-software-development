// pages/index/index.js
const data = require('../../utils/data.js')

const LEVEL_KEYS = ['level01', 'level02', 'level03', 'level04']

Page({
  data: {
    levels: []
  },

  // 从游戏页返回时需要刷新星级与最佳步数
  onShow() {
    this.loadLevels()
  },

  // 组装关卡列表（含最佳步数与星级）
  loadLevels() {
    const best = data.getBest()
    const levels = LEVEL_KEYS.map((key, i) => {
      const b = best[key] || 0
      const stars = b ? data.getStars(key, b) : 0
      return {
        level: key,
        num: i + 1,
        best: b,
        cleared: b > 0,
        starText: data.starText(stars)
      }
    })
    this.setData({ levels })
  },

  // 进入关卡
  chooseLevel(e) {
    const level = e.currentTarget.dataset.level
    wx.navigateTo({
      url: '../game/game?level=' + level
    })
  }
})