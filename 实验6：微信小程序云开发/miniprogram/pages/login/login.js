// pages/login/login.js
const { loginByPhone, saveMyProfile, uploadAvatar, resolveTempUrls } = require("../../utils/api");

const app = getApp();

Page({
  data: {
    phone: "",
    password: "",
    submitting: false,
    // 微信授权资料弹窗
    showWechatProfile: false,
    draftAvatarUrl: "",
    draftNickName: "",
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 手机号密码登录
  onPhoneLogin() {
    const { phone, password } = this.data;
    if (!phone) return wx.showToast({ title: "请输入手机号", icon: "none" });
    if (!/^1\d{10}$/.test(phone)) return wx.showToast({ title: "手机号格式不对", icon: "none" });
    if (!password) return wx.showToast({ title: "请输入密码", icon: "none" });

    this.setData({ submitting: true });
    loginByPhone({ phone, password })
      .then((user) => {
        // 成功后：把资料存进 globalData（云端记录是权威来源）
        return resolveTempUrls([user]).then(([u]) => {
          // 记住登录的是哪个账号，之后的「我的照片」按它隔离
          app.globalData.accountId = u._id || "";
          app.globalData.userInfo = {
            avatarUrl: u.avatarUrl || "",
            avatarTempUrl: u.avatarTempUrl || "",
            nickName: u.nickName || "",
            loginMethod: "phone",
          };
          this.setData({ submitting: false });
          wx.showToast({ title: "登录成功", icon: "success" });
          setTimeout(() => wx.navigateBack(), 600);
        });
      })
      .catch((err) => {
        console.error("[login] 手机号登录失败", err);
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || "手机号或密码错误", icon: "none" });
      });
  },

  // 微信授权登录：打开资料选择弹窗
  onWechatLogin() {
    this.setData({
      showWechatProfile: true,
      draftAvatarUrl: "",
      draftNickName: "",
    });
  },

  closeWechatProfile() {
    this.setData({ showWechatProfile: false });
  },

  chooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) this.setData({ draftAvatarUrl: avatarUrl });
  },

  updateDraftName(e) {
    this.setData({ draftNickName: e.detail.value });
  },

  confirmWechatLogin() {
    const nickName = (this.data.draftNickName || "").trim();
    const localAvatar = this.data.draftAvatarUrl;
    if (!localAvatar) return wx.showToast({ title: "请选择头像", icon: "none" });
    if (!nickName) return wx.showToast({ title: "请输入昵称", icon: "none" });

    this.setData({ submitting: true });
    const uploadTask = /^cloud:\/\//.test(localAvatar)
      ? Promise.resolve(localAvatar)
      : uploadAvatar(localAvatar).catch(() => localAvatar);

    uploadTask
      .then((avatarFileID) =>
        saveMyProfile({
          avatarUrl: avatarFileID,
          nickName,
          loginMethod: "wechat",
        })
      )
      .then(() => app.refreshProfile())
      .then(() => {
        this.setData({ submitting: false, showWechatProfile: false });
        wx.showToast({ title: "登录成功", icon: "success" });
        setTimeout(() => wx.navigateBack(), 600);
      })
      .catch((err) => {
        console.error("[login] 微信授权失败", err);
        this.setData({ submitting: false });
        wx.showToast({ title: "登录失败，请重试", icon: "none" });
      });
  },

  goToRegister() {
    wx.redirectTo({ url: "/pages/register/register" });
  },
});
