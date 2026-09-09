// pages/detail/detail.js
const { getPhoto, deletePhoto, resolveTempUrls, isFavorited, addFavorite, removeFavorite } = require("../../utils/api");
const { formatLocation } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    photo: null,
    loading: true,
    // 是否是上传者本人：只有本人能看到删除按钮
    isMine: false,
    // 是否已收藏
    isFav: false,
    favToggling: false,
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.fetchPhoto();
  },

  fetchPhoto() {
    if (!this.data.id) return;
    this.setData({ loading: true });
    return app
      .ensureLogin()
      .then(() => getPhoto(this.data.id))
      .then(res => resolveTempUrls([res.data]))
      .then(list => {
        const photo = list[0] || null;
        if (photo) photo.locationText = formatLocation(photo);
        this.setData({
          photo,
          loading: false,
          isMine: !!(photo && photo.ownerId && photo.ownerId === app.globalData.accountId),
          isFav: false,
        });
        this.syncFavState();
        if (photo) {
          wx.setNavigationBarTitle({
            title: photo.nickName ? photo.nickName + "的照片" : "图片分享",
          });
        }
      })
      .catch(err => {
        console.error("[detail] getPhoto 失败", err);
        this.setData({ loading: false });
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  // 下载到本地：云开发用 wx.cloud.downloadFile 直接按 fileID 拿云存储文件
  downloadPhoto() {
    const fileID = this.data.photo && this.data.photo.photoUrl;
    if (!fileID) {
      wx.showToast({ title: "暂不可下载", icon: "none" });
      return;
    }
    wx.showLoading({ title: "下载中…" });
    wx.cloud.downloadFile({
      fileID,
      success(res) {
        if (res.statusCode && res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({ title: "下载失败", icon: "none" });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.hideLoading();
            wx.showToast({ title: "已保存到相册", icon: "success" });
          },
          fail(err) {
            wx.hideLoading();
            // 用户拒绝授权时给出提示
            if (err && /auth deny|authorize/i.test(err.errMsg || "")) {
              wx.showModal({ title: "需要授权", content: "请在设置中允许保存到相册", showCancel: false });
            } else {
              wx.showToast({ title: "保存失败", icon: "none" });
            }
          },
        });
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: "下载失败", icon: "none" });
      },
    });
  },

  sharePhoto() {
    // button 的 open-type="share" 已经触发分享，这里只是兜底提示
    wx.showToast({ title: "点击右上角转发", icon: "none" });
  },

  // ===== 收藏 =====
  syncFavState() {
    const photo = this.data.photo;
    if (!photo) return;
    isFavorited(app.globalData.accountId, photo._id).then((fav) => this.setData({ isFav: fav }));
  },

  toggleFavorite() {
    const photo = this.data.photo;
    if (!photo) return;
    if (!app.globalData.accountId) {
      wx.showToast({ title: "请先登录再收藏", icon: "none" });
      return;
    }
    if (this.data.favToggling) return;
    this.setData({ favToggling: true });
    const task = this.data.isFav
      ? removeFavorite(app.globalData.accountId, photo._id)
      : addFavorite(app.globalData.accountId, photo._id);
    task
      .then(() => {
        this.setData({ isFav: !this.data.isFav, favToggling: false });
        wx.showToast({ title: this.data.isFav ? "已收藏" : "已取消收藏", icon: "success" });
      })
      .catch((err) => {
        console.error("[detail] 收藏操作失败", err);
        this.setData({ favToggling: false });
        wx.showToast({ title: "操作失败，请重试", icon: "none" });
      });
  },

  // 删除自己的照片：二次确认 → 删数据库记录（含云存储原图）→ 返回
  deletePhoto() {
    const id = this.data.photo && this.data.photo._id;
    if (!id) return;
    wx.showModal({
      title: "删除照片",
      content: "删除后照片和云端文件都无法恢复，确定删除吗？",
      confirmText: "删除",
      confirmColor: "#e6604c",
      success: ({ confirm }) => {
        if (!confirm) return;
        wx.showLoading({ title: "删除中…", mask: true });
        deletePhoto(id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已删除", icon: "success" });
            setTimeout(() => wx.navigateBack(), 600);
          })
          .catch(err => {
            wx.hideLoading();
            console.error("[detail] 删除失败", err);
            wx.showToast({ title: "删除失败，只能删除自己上传的照片", icon: "none" });
          });
      },
    });
  },

  previewPhoto() {
    const url = this.data.photo && this.data.photo.tempUrl;
    if (!url) return;
    wx.previewImage({ urls: [url] });
  },

  onShareAppMessage() {
    const p = this.data.photo;
    return {
      title: p && p.nickName ? `${p.nickName} 给你分享了一张照片` : "给你分享一张好看的照片",
      path: "/pages/detail/detail?id=" + (p ? p._id : ""),
      imageUrl: p ? p.tempUrl : "",
    };
  },
});
