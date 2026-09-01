const common = require('../../utils/common.js')

Page({
  data: {
    isLogin: false, avatarUrl: '', nickName: '',
    activeView: 'favorites', newsList: [], number: 0,
    historyList: [], editing: false, selectedIds: [], selectedMap: {},
    showProfileEditor: false, profileEditorMode: 'edit',
    draftAvatarUrl: '', draftNickName: ''
  },

  onLoad() {
    const userInfo = common.getUserProfile()
    if (userInfo && common.isUserLoggedIn()) this.setData({ isLogin: true, ...userInfo })
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) tabBar.setData({ selected: 1 })
    this.refreshReadingData()
  },

  refreshReadingData() {
    if (!this.data.isLogin) return this.setData({ newsList: [], historyList: [], number: 0 })
    const newsList = common.getFavorites()
    this.setData({ newsList, number: newsList.length, historyList: common.getHistory() })
  },

  switchView(e) { this.setData({ activeView: e.currentTarget.dataset.view, editing: false, selectedIds: [], selectedMap: {} }) },
  toggleEdit() { this.setData({ editing: !this.data.editing, selectedIds: [], selectedMap: {} }) },
  handleFavoriteItem(e) { this.data.editing ? this.toggleSelect(e) : this.goToDetail(e) },
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const selectedIds = this.data.selectedIds.includes(id)
      ? this.data.selectedIds.filter(item => item !== id)
      : [...this.data.selectedIds, id]
    const selectedMap = {}
    selectedIds.forEach(item => { selectedMap[item] = true })
    this.setData({ selectedIds, selectedMap })
  },
  removeSelected() {
    if (!this.data.selectedIds.length) return wx.showToast({ title: '请选择文章', icon: 'none' })
    wx.showModal({ title: '取消收藏', content: `确定取消收藏选中的 ${this.data.selectedIds.length} 篇文章吗？`, success: ({ confirm }) => {
      if (!confirm) return
      common.removeFavorites(this.data.selectedIds)
      this.setData({ editing: false, selectedIds: [], selectedMap: {} })
      this.refreshReadingData()
    } })
  },
  clearHistory() { wx.showModal({ title: '清空阅读历史', content: '此操作不会删除收藏文章。', success: ({ confirm }) => { if (confirm) { common.clearHistory(); this.refreshReadingData() } } }) },

  openProfileEditor() {
    this.setData({
      showProfileEditor: true,
      profileEditorMode: 'edit',
      draftAvatarUrl: this.data.avatarUrl,
      draftNickName: this.data.nickName
    })
  },
  closeProfileEditor() { this.setData({ showProfileEditor: false }) },
  chooseAvatar(e) {
    const { avatarUrl } = e.detail
    if (!avatarUrl) return
    wx.saveFile({
      tempFilePath: avatarUrl,
      success: ({ savedFilePath }) => this.setData({ draftAvatarUrl: savedFilePath }),
      fail: () => {
        this.setData({ draftAvatarUrl: avatarUrl })
        wx.showToast({ title: '头像将在本次使用中生效', icon: 'none' })
      }
    })
  },
  updateDraftName(e) { this.setData({ draftNickName: e.detail.value }) },
  saveProfile() {
    const nickName = this.data.draftNickName.trim()
    const avatarUrl = this.data.draftAvatarUrl
    if (!avatarUrl) return wx.showToast({ title: '请选择头像', icon: 'none' })
    if (!nickName) return wx.showToast({ title: '请输入昵称', icon: 'none' })
    const userInfo = { avatarUrl, nickName }
    common.saveUserProfile(userInfo)
    if (this.data.profileEditorMode === 'login') {
      common.startUserSession()
      this.setData({ ...userInfo, isLogin: true, showProfileEditor: false })
      this.refreshReadingData()
      wx.showToast({ title: '登录成功' })
      return
    }
    this.setData({ ...userInfo, showProfileEditor: false })
    wx.showToast({ title: '资料已更新' })
  },

  getUserInfo() {
    const savedProfile = common.getUserProfile()
    if (savedProfile) {
      wx.showModal({
        title: '微信授权登录',
        content: '授权后将恢复你之前保存的头像、昵称、收藏和阅读历史。',
        confirmText: '授权登录',
        cancelText: '取消',
        confirmColor: '#07c160',
        success: ({ confirm }) => {
          if (confirm) this.loginWithSavedProfile(savedProfile)
        }
      })
      return
    }

    wx.showModal({
      title: '首次登录',
      content: '是否使用微信头像和昵称登录海大新闻？',
      confirmText: '微信资料',
      cancelText: '暂不使用',
      confirmColor: '#07c160',
      success: ({ confirm }) => {
        if (confirm) this.requestUserProfile()
      }
    })
  },
  loginWithSavedProfile(userInfo) {
    common.startUserSession()
    this.setData({ isLogin: true, ...userInfo })
    this.refreshReadingData()
    wx.showToast({ title: '已恢复个人资料' })
  },
  requestUserProfile() {
    this.setData({
      showProfileEditor: true,
      profileEditorMode: 'login',
      draftAvatarUrl: '',
      draftNickName: ''
    })
  },
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后将保留你编辑的头像、昵称、收藏和阅读历史，下次登录可以继续使用。',
      confirmText: '退出登录',
      confirmColor: '#ed3b4f',
      success: ({ confirm }) => {
        if (!confirm) return
        common.endUserSession()
        this.setData({
          isLogin: false,
          avatarUrl: '',
          nickName: '',
          newsList: [],
          historyList: [],
          number: 0,
          showProfileEditor: false
        })
      }
    })
  },
  goToDetail(e) { if (!this.data.editing) wx.navigateTo({ url: `../detail/detail?id=${e.currentTarget.dataset.id}` }) }
})
