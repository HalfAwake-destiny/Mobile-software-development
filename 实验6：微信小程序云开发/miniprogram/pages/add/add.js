// pages/add/add.js
const { uploadPhoto, addPhoto, listMyPhotos, resolveTempUrls } = require("../../utils/api");
const { formatDate, formatLocation } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    userInfo: null,
    historyList: [],
    uploading: 0,
  },

  onShow() {
    this.syncProfile();
    this.fetchHistory();
  },

  // 登录态 = 云端 users 集合里有我的资料（头像 + 昵称）
  syncProfile() {
    const u = app.globalData.userInfo;
    this.setData({ userInfo: u ? { ...u } : null });
  },

  // 未登录 → 去登录页
  goToLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },

  fetchHistory() {
    return app
      .ensureLogin()
      .then(() => listMyPhotos(app.globalData.accountId))
      .then((res) => resolveTempUrls(res.data || []))
      .then((list) => {
        const historyList = list.map((p) => Object.assign({}, p, { locationText: formatLocation(p) }));
        this.setData({ historyList });
      })
      .catch((err) => console.error("[add] listMyPhotos 失败", err));
  },

  upload() {
    if (!app.globalData.userInfo) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    if (!app.globalData.accountId) {
      wx.showToast({ title: "登录信息未就绪，请稍后再试", icon: "none" });
      return;
    }
    wx.chooseImage({
      count: 9,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const files = res.tempFilePaths;
        this.setData({ uploading: files.length });
        wx.showLoading({ title: "上传中 0/" + files.length, mask: true });

        const u = app.globalData.userInfo;
        const tasks = files.map((filePath) =>
          // 1) 传到云存储拿 fileID  2) 写一条数据库记录
          // ownerId = 当前登录账号（users._id），「我的照片」按它隔离，换账号互不可见；
          // _openid 由云开发自动写入，用于数据库权限（仅创建者可删改）
          uploadPhoto(filePath)
            .then((fileID) =>
              addPhoto({
                photoUrl: fileID,
                ownerId: app.globalData.accountId,
                // 存 cloud:// 的头像 fileID（不是临时链接，临时链接会过期）
                avatarUrl: u.avatarUrl || "",
                nickName: u.nickName || "匿名",
                country: u.country || "",
                province: u.province || "",
                city: u.city || "",
                addDate: formatDate(new Date()),
                // 毫秒时间戳，用于排序：同一天内的新照片也能排到最前面
                createdAt: Date.now(),
              })
            )
            .then(() => {
              const left = this.data.uploading - 1;
              this.setData({ uploading: left });
              wx.showLoading({
                title: "上传中 " + (files.length - left) + "/" + files.length,
                mask: true,
              });
            })
            .catch((err) => {
              console.error("[add] 单张上传失败", err);
              throw err;
            })
        );

        Promise.allSettled(tasks).then((results) => {
          wx.hideLoading();
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const fail = results.length - ok;
          if (ok && !fail) {
            wx.showToast({ title: "上传成功", icon: "success" });
          } else if (ok && fail) {
            wx.showToast({ title: `成功 ${ok} 张，失败 ${fail} 张`, icon: "none" });
          } else {
            wx.showToast({ title: "上传失败", icon: "none" });
          }
          this.setData({ uploading: 0 });
          this.fetchHistory();
        });
      },
    });
  },

  onTapHistory(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ urls: [url] });
  },
});
