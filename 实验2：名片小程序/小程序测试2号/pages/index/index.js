Page({
  data: {
    hobbies: [
      {
        icon: '♪',
        name: '轻音乐',
        note: '喜欢安静、舒缓的旋律',
      },
      {
        icon: '书',
        name: '小说阅读',
        note: '在故事中感受不同的世界',
      },
    ],
  },

  openBlog() {
    wx.navigateTo({
      url: '/pages/blog/blog',
    })
  },
})
