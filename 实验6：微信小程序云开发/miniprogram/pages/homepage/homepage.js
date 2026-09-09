// pages/homepage/homepage.js
// 两种模式：
//   不带参数进入（我的主页入口）→ 我的个人中心，含登录/退出/资料编辑
//   ?openid=xxx 进入（点别人头像）→ 浏览 TA 的主页
const {
  listMyPhotos,
  getProfileByOpenid,
  getProfileById,
  saveMyProfile,
  uploadAvatar,
  resolveTempUrls,
} = require("../../utils/api");
const { formatLocation } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    // 身份
    openid: "",
    ownerId: "",
    isMe: true,
    isLogin: false,
    loginMethodText: "微信",

    // 资料
    avatarUrl: "",
    nickName: "",
    locationText: "",

    // 照片
    photoList: [],
    loading: true,

    // 资料编辑弹窗
    showProfileEditor: false,
    draftAvatarUrl: "",
    draftNickName: "",
    saving: false,
  },

  onLoad(options) {
    // 三种进入方式：
    //   不带参数            → 我的个人中心
    //   ?ownerId=账号id     → TA 的主页（推荐，同一设备多账号也能精确区分）
    //   ?openid=xxx         → TA 的主页（旧照片兜底）
    const ownerId = options.ownerId || "";
    const openid = options.openid || "";
    const isMe = !ownerId && !openid;
    this.setData({ ownerId, openid, isMe });
    if (!isMe) {
      wx.setNavigationBarTitle({ title: "TA 的主页" });
    }
  },

  onShow() {
    if (this.data.isMe) {
      this.refreshMe();
    } else {
      this.fetchOther();
    }
  },

  onPullDownRefresh() {
    const p = this.data.isMe ? this.refreshMe() : this.fetchOther();
    if (p && p.then) p.then(() => wx.stopPullDownRefresh());
  },

  // ===== 我的个人中心 =====
  refreshMe() {
    return app
      .ensureLogin()
      .then(() => {
        const u = app.globalData.userInfo;
        this.setData({
          openid: app.globalData.openid,
          isLogin: !!u,
          avatarUrl: u ? u.avatarTempUrl || u.avatarUrl : "",
          nickName: u ? u.nickName : "",
          loginMethodText: u && u.loginMethod === "phone" ? "手机号" : "微信",
        });
        if (u) return this.fetchMyPhotos();
        this.setData({ photoList: [], loading: false });
      })
      .catch((err) => console.error("[homepage] refreshMe 失败", err));
  },

  fetchMyPhotos() {
    this.setData({ loading: true });
    return listMyPhotos(app.globalData.accountId)
      .then((res) => resolveTempUrls(res.data || []))
      .then((list) => {
        const photoList = list.map((p) => Object.assign({}, p, { locationText: formatLocation(p) }));
        this.setData({ photoList, loading: false });
      })
      .catch((err) => {
        console.error("[homepage] listMyPhotos 失败", err);
        this.setData({ loading: false });
      });
  },

  // ===== 浏览别人的主页 =====
  fetchOther() {
    this.setData({ loading: true });
    // 有 ownerId 精确到账号；只有 openid 时退回旧方式（可能不准）
    const profileTask = this.data.ownerId
      ? getProfileById(this.data.ownerId)
      : getProfileByOpenid(this.data.openid);
    return app
      .ensureLogin()
      .then(() => profileTask)
      .then((profile) => {
        const p = profile || {};
        return resolveTempUrls([p]).then(([x]) => {
          this.setData({
            avatarUrl: x.avatarTempUrl || x.avatarUrl || "",
            nickName: x.nickName || "",
            locationText: x.province || x.country || "",
          });
          // TA 的照片按 TA 的账号记录查（_id = ownerId）
          return listMyPhotos(this.data.ownerId || p._id || "");
        });
      })
      .then((res) => resolveTempUrls(res.data || []))
      .then((list) => {
        const photoList = list.map((p) => Object.assign({}, p, { locationText: formatLocation(p) }));
        this.setData({ photoList, loading: false });
      })
      .catch((err) => {
        console.error("[homepage] fetchOther 失败", err);
        this.setData({ loading: false });
      });
  },

  // ===== 未登录 → 跳登录页 =====
  goToLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },

  // ===== 收藏管理 =====
  goToFavorites() {
    wx.navigateTo({ url: "/pages/favorites/favorites" });
  },

  // ===== 资料编辑（chooseAvatar + nickname） =====
  openProfileEditor() {
    this.setData({
      showProfileEditor: true,
      draftAvatarUrl: this.data.isLogin ? this.data.avatarUrl : "",
      draftNickName: this.data.isLogin ? this.data.nickName : "",
    });
  },

  closeProfileEditor() {
    this.setData({ showProfileEditor: false });
  },

  chooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    this.setData({ draftAvatarUrl: avatarUrl });
  },

  updateDraftName(e) {
    this.setData({ draftNickName: e.detail.value });
  },

  saveProfile() {
    const nickName = (this.data.draftNickName || "").trim();
    const localAvatar = this.data.draftAvatarUrl;

    if (!localAvatar) return wx.showToast({ title: "请选择头像", icon: "none" });
    if (!nickName) return wx.showToast({ title: "请输入昵称", icon: "none" });

    this.setData({ saving: true });

    const uploadTask = /^cloud:\/\//.test(localAvatar)
      ? Promise.resolve(localAvatar)
      : uploadAvatar(localAvatar).catch(() => {
          console.warn("[homepage] 头像上传云存储失败，降级存本地路径");
          return localAvatar;
        });

    uploadTask
      .then((avatarFileID) =>
        saveMyProfile({
          avatarUrl: avatarFileID,
          nickName,
        })
      )
      .then(() => app.refreshProfile())
      .then(() => {
        this.setData({ saving: false, showProfileEditor: false });
        wx.showToast({ title: "资料已更新", icon: "success" });
        this.refreshMe();
      })
      .catch((err) => {
        console.error("[homepage] saveProfile 失败", err);
        this.setData({ saving: false });
        wx.showToast({ title: "保存失败，请重试", icon: "none" });
      });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "云端资料会保留，下次登录继续使用。确定退出吗？",
      confirmText: "退出登录",
      confirmColor: "#e6604c",
      success: ({ confirm }) => {
        if (!confirm) return;
        app.globalData.userInfo = null;
        app.globalData.accountId = "";
        this.setData({ isLogin: false, avatarUrl: "", nickName: "", photoList: [] });
        wx.showToast({ title: "已退出", icon: "none" });
      },
    });
  },

  onTapImage(e) {
    const id = e.detail.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/detail/detail?id=" + id });
  },
});
