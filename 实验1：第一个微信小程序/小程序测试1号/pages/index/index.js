Page({
  data: {
    message: "Hello World"
  },

  changeText() {
    this.setData({
      message: "你好，微信小程序！"
    })
  }
})