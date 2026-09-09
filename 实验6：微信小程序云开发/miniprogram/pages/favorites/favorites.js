// pages/favorites/favorites.js
// 收藏管理：列出当前登录账号收藏的照片，可跳详情、可取消收藏
const {
  listMyFavorites,
  getPhotosByIds,
  removeFavorite,
  resolveTempUrls,
} = require("../../utils/api");
const { formatLocation } = require("../../utils/format");

const app = getApp();

Page({
  data: {
    favList: [],
    loading: true,
  },

  onShow() {
    // 每次进来都刷新：在详情页里新增/取消收藏后回来能看到最新状态
    this.fetchFavorites();
  },

  onPullDownRefresh() {
    this.fetchFavorites().finally(() => wx.stopPullDownRefresh());
  },

  fetchFavorites() {
    if (!app.globalData.accountId) {
      this.setData({ favList: [], loading: false });
      return Promise.resolve();
    }
    this.setData({ loading: true });
    return listMyFavorites(app.globalData.accountId)
      .then((res) => {
        // 先记住收藏顺序，再按 _id 批量取照片详情
        const favOrder = (res.data || []).map((f) => f.photoId);
        return getPhotosByIds(favOrder).then((photoRes) => {
          const byId = {};
          (photoRes.data || []).forEach((p) => { byId[p._id] = p; });
          // 可能存在照片已被作者删除的情况，跳过取不到的
          const list = favOrder
            .map((id) => byId[id])
            .filter(Boolean)
            .map((p) => Object.assign({}, p, { locationText: formatLocation(p) }));
          return resolveTempUrls(list);
        });
      })
      .then((list) => this.setData({ favList: list || [], loading: false }))
      .catch((err) => {
        console.error("[favorites] 加载失败", err);
        this.setData({ loading: false });
        wx.showToast({ title: "收藏加载失败", icon: "none" });
      });
  },

  // 点图片进详情
  onTapImage(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/detail/detail?id=" + id });
  },

  // 点大图预览
  onTapPreview(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ urls: [url] });
  },

  // 取消收藏：二次确认 → 删收藏记录 → 刷新列表
  onCancelFav(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: "取消收藏",
      content: "确定把这张照片移出收藏吗？",
      confirmText: "移出",
      confirmColor: "#e6604c",
      success: ({ confirm }) => {
        if (!confirm) return;
        removeFavorite(app.globalData.accountId, id)
          .then(() => {
            wx.showToast({ title: "已移出", icon: "success" });
            this.fetchFavorites();
          })
          .catch((err) => {
            console.error("[favorites] 取消收藏失败", err);
            wx.showToast({ title: "操作失败", icon: "none" });
          });
      },
    });
  },

  goBrowse() {
    // 从收藏页回社区首页（没有 tabBar，用 reLaunch 清掉页面栈）
    wx.reLaunch({ url: "/pages/index/index" });
  },
});
