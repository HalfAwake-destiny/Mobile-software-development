// app.js
const { getOpenId, getMyProfile, resolveTempUrls } = require("./utils/api");

App({
  globalData: {
    // ====== 环境 ID：第一次跑之前必须填 ======
    // 获取方式：微信开发者工具顶部工具栏 →「云开发」按钮 → 环境概览 → 复制环境 ID
    env: "cloud1-d6gkat5lc7d387014",
    openid: "",
    // 当前登录的账号 = users 集合记录的 _id。
    // openid 是微信/设备级身份，同一台设备换手机号登录 openid 不变；
    // 「我的照片」要按账号隔离就必须用 accountId，否则换账号后旧账号照片还会出现。
    accountId: "",
    // 用户资料从云端 users 集合读，随登录账号切换
    userInfo: null,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }
    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true,
    });
    this.ensureLogin();
  },

  // 1) 拿 openid  2) 顺带把云端「我的资料」拉下来
  ensureLogin() {
    if (this.globalData.openid) return Promise.resolve(this.globalData.openid);
    return getOpenId().then((openid) => {
      if (!openid) {
        wx.showToast({ title: "云函数未部署", icon: "none" });
        return "";
      }
      this.globalData.openid = openid;
      console.log("[login] openid =", openid);
      return this.loadProfile();
    });
  },

  // 从 users 集合读「我」的资料。
  // 注意这里不加 where —— 云开发权限会自动只返回 _openid == 当前用户的那条，
  // 所以换个账号登进来，拿到的就是另一条记录（或 null）。这就是多用户隔离的证明。
  loadProfile() {
    return getMyProfile()
      .then((profile) => {
        if (!profile) {
          this.globalData.accountId = "";
          this.globalData.userInfo = null;
          return null;
        }
        return resolveTempUrls([profile]).then(([p]) => {
          this.globalData.accountId = p._id || "";
          this.globalData.userInfo = {
            avatarUrl: p.avatarUrl || "",
            avatarTempUrl: p.avatarTempUrl || "",
            nickName: p.nickName || "",
          };
          return this.globalData.userInfo;
        });
      })
      .catch((err) => {
        console.error("[app] loadProfile 失败", err);
        this.globalData.accountId = "";
        this.globalData.userInfo = null;
        return null;
      });
  },

  // 是否已登录（云端有我的资料 = 已设置过头像昵称）
  isLoggedIn() {
    return !!(this.globalData.openid && this.globalData.userInfo);
  },

  // 供资料编辑保存后刷新
  refreshProfile() {
    return this.loadProfile();
  },
});
