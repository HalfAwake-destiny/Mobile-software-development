// pages/register/register.js
const { registerByPhone } = require("../../utils/api");

const app = getApp();

Page({
  data: {
    phone: "",
    password: "",
    confirmPassword: "",
    nickName: "",
    submitting: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onConfirmInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  onRegister() {
    const { phone, password, confirmPassword, nickName } = this.data;

    if (!phone) return wx.showToast({ title: "请输入手机号", icon: "none" });
    if (!/^1\d{10}$/.test(phone)) return wx.showToast({ title: "手机号格式不对", icon: "none" });
    if (!password) return wx.showToast({ title: "请输入密码", icon: "none" });
    if (password.length < 6) return wx.showToast({ title: "密码至少 6 位", icon: "none" });
    if (password !== confirmPassword) return wx.showToast({ title: "两次密码不一致", icon: "none" });

    this.setData({ submitting: true });
    registerByPhone({ phone, password, nickName })
      .then((user) => {
        // 注册成功 = 已写入 users 集合。直接以这个账号身份进入，
        // accountId 必须指向新账号的记录，否则照片会算到别的账号头上
        app.globalData.accountId = user._id;
        app.globalData.userInfo = {
          avatarUrl: "",
          avatarTempUrl: "",
          nickName: user.nickName || "",
          loginMethod: "phone",
        };
        this.setData({ submitting: false });
        wx.showToast({ title: "注册成功", icon: "success" });
        // 登录态已有，回到个人中心
        setTimeout(() => wx.navigateBack(), 600);
      })
      .catch((err) => {
        console.error("[register] 失败", err);
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || "注册失败", icon: "none" });
      });
  },

  goToLogin() {
    wx.redirectTo({ url: "/pages/login/login" });
  },
});
