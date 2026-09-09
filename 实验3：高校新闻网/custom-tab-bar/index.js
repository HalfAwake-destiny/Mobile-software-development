Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        caption: 'NEWS',
        iconPath: '/images/index.png',
        selectedIconPath: '/images/index_blue.png'
      },
      {
        pagePath: '/pages/my/my',
        text: '我的',
        caption: 'PROFILE',
        iconPath: '/images/my.png',
        selectedIconPath: '/images/my_blue.png'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    }
  }
})
