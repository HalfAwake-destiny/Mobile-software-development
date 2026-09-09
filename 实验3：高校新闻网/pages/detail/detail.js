const common = require('../../utils/common.js')

Page({
  data: {
    article: null,
    isAdd: false,
    relatedNews: [],
    progress: 0,
    showSettings: false,
    fontSize: 'medium',
    darkMode: false
  },

  onLoad(options) {
    const result = common.getNewsDetail(options.id || '')
    if (result.code !== '200') {
      wx.showToast({ title: '新闻不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    const article = result.news
    const favorite = wx.getStorageSync(common.getFavoriteKey(article.id))
    const settings = common.getReadingSettings()
    common.addHistory(article)
    this.setData({
      article,
      isAdd: Boolean(favorite),
      relatedNews: common.getRelatedNews(article.id, article.category),
      ...settings
    })
  },

  onPageScroll({ scrollTop }) {
    wx.createSelectorQuery().select('.article').boundingClientRect(rect => {
      if (!rect) return
      const windowHeight = wx.getWindowInfo().windowHeight
      const scrollable = Math.max(rect.height - windowHeight, 1)
      this.setData({ progress: Math.min(100, Math.round(scrollTop / scrollable * 100)) })
    }).exec()
  },

  addFavorites() {
    if (!this.ensureLogin()) return
    wx.setStorageSync(common.getFavoriteKey(this.data.article.id), this.data.article)
    this.setData({ isAdd: true })
    wx.showToast({ title: '已加入收藏' })
  },

  cancelFavorites() {
    if (!this.ensureLogin()) return
    wx.removeStorageSync(common.getFavoriteKey(this.data.article.id))
    this.setData({ isAdd: false })
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  backToTop() { wx.pageScrollTo({ scrollTop: 0, duration: 300 }) },
  ensureLogin() {
    if (common.isUserLoggedIn()) return true
    wx.showModal({
      title: '尚未登录',
      content: '登录后才能收藏和管理文章，是否前往个人中心登录？',
      confirmText: '去登录',
      confirmColor: '#176b94',
      success: ({ confirm }) => {
        if (confirm) wx.switchTab({ url: '/pages/my/my' })
      }
    })
    return false
  },
  toggleSettings() { this.setData({ showSettings: !this.data.showSettings }) },
  setFontSize(e) { this.updateSettings({ fontSize: e.currentTarget.dataset.size }) },
  toggleDarkMode() { this.updateSettings({ darkMode: !this.data.darkMode }) },
  updateSettings(change) {
    const settings = { fontSize: this.data.fontSize, darkMode: this.data.darkMode, ...change }
    this.setData(settings)
    common.saveReadingSettings(settings)
  },
  goToRelated(e) { wx.redirectTo({ url: `detail?id=${e.currentTarget.dataset.id}` }) }
})
