// pages/index/index.js
const { listPhotos, resolveTempUrls } = require("../../utils/api");
const { formatLocation } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    photoList: [],
    loading: true,
    // 我的头像昵称（右上角入口显示用）
    myAvatar: "",
    myNickName: "",
  },

  onShow() {
    // 每次回到首页都刷新数据和登录态
    this.fetchPhotos();
    this.syncMyProfile();
  },

  onPullDownRefresh() {
    this.fetchPhotos().then(() => wx.stopPullDownRefresh());
  },

  // 从 globalData 同步我的资料（登录/退出后回来能及时刷新）
  syncMyProfile() {
    const u = app.globalData.userInfo;
    this.setData({
      myAvatar: u ? u.avatarTempUrl || u.avatarUrl : "",
      myNickName: u ? u.nickName : "",
    });
  },

  fetchPhotos() {
    this.setData({ loading: true });
    return app
      .ensureLogin()
      .then(() => listPhotos())
      .then((res) => resolveTempUrls(res.data || []))
      .then((items) => {
        const photoList = items.map((p) => Object.assign({}, p, { locationText: formatLocation(p) }));
        this.setData({ photoList, loading: false });
      })
      .catch((err) => {
        console.error("[index] listPhotos 失败", err);
        this.setData({ loading: false });
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  goToAdd() {
    wx.navigateTo({ url: "/pages/add/add" });
  },

  goToMyPage() {
    wx.navigateTo({ url: "/pages/homepage/homepage" });
  },

  onTapImage(e) {
    const id = e.detail.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/detail/detail?id=" + id });
  },

  onTapAvatar(e) {
    const { openid, ownerId } = e.detail;
    // 点自己账号的头像 → 个人中心；点别人的 → TA 的主页（按账号区分）
    if (ownerId && ownerId === app.globalData.accountId) {
      wx.navigateTo({ url: "/pages/homepage/homepage" });
      return;
    }
    if (ownerId) {
      wx.navigateTo({ url: "/pages/homepage/homepage?ownerId=" + ownerId });
    } else if (openid && openid !== app.globalData.openid) {
      // 旧照片没有 ownerId，退回按 openid 区分
      wx.navigateTo({ url: "/pages/homepage/homepage?openid=" + openid });
    }
  },
});
