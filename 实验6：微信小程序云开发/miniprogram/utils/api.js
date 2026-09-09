// utils/api.js
// 微信云开发版：全部走 wx.cloud.*，不依赖任何自建后端。

let _db = null;
function db() {
  if (!_db) _db = wx.cloud.database();
  return _db;
}

const COLLECTION = "photos";
const USERS = "users";
const FAVS = "favorites";

// ====== 登录：openid 只能从云函数拿（前端拿不到） ======
function getOpenId() {
  return wx.cloud
    .callFunction({ name: "quickstartFunctions", data: { type: "getOpenId" } })
    .then((res) => (res.result && res.result.openid) || "")
    .catch((err) => {
      console.error("[api] getOpenId 失败，检查云函数是否已上传部署", err);
      return "";
    });
}

// ====== 数据库：所有人的照片（集合权限「所有人可读」） ======
// 按 createdAt（毫秒时间戳）倒序：addDate 只是日期字符串，同一天内分不出先后
function listPhotos() {
  return db().collection(COLLECTION).orderBy("createdAt", "desc").limit(50).get();
}

// ====== 数据库：某个登录账号的照片 ======
// 按账号（users 记录 _id）过滤，而不是按 openid —— openid 是设备级的，
// 同一台设备换手机号登录 openid 不变，按 openid 查会把别的账号的照片也查出来。
function listMyPhotos(accountId) {
  if (!accountId) return Promise.resolve({ data: [] });
  return db()
    .collection(COLLECTION)
    .where({ ownerId: accountId })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
}

// ====== 数据库：单张 ======
function getPhoto(id) {
  return db().collection(COLLECTION).doc(id).get();
}

// ====== 数据库：新增一条（_openid 由云开发自动写入） ======
function addPhoto(data) {
  return db().collection(COLLECTION).add({ data });
}

// ====== 数据库：删除一条照片（含云存储文件） ======
// 客户端 remove 受集合权限约束：「仅创建者可读写」下只能删 _openid 是自己的记录，
// 删别人的会直接报 permission denied，这就是"上传者才能删"的权限保证。
function deletePhoto(id) {
  return getPhoto(id).then((res) => {
    const fileID = res.data && res.data.photoUrl;
    const tasks = [db().collection(COLLECTION).doc(id).remove()];
    // 云存储里的原图一并删掉，避免留下孤儿文件；删失败不阻塞流程
    if (fileID) {
      tasks.push(
        wx.cloud
          .deleteFile({ fileList: [fileID] })
          .catch((err) => console.warn("[api] 云存储文件删除失败（记录已删）", err))
      );
    }
    return Promise.all(tasks).then(() => true);
  });
}

// ====== 存储：通用上传，folder 决定云存储目录 ======
function uploadFile(filePath, folder) {
  const ext = (filePath.split(".").pop() || "jpg").toLowerCase();
  const cloudPath = `${folder}/${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath }).then((res) => res.fileID);
}

// 照片 → photos/ 目录
function uploadPhoto(filePath) {
  return uploadFile(filePath, "photos");
}

// 头像 → avatars/ 目录
function uploadAvatar(filePath) {
  return uploadFile(filePath, "avatars");
}

// ====== 存储：把 cloud:// 批量换成 https 临时链接 ======
// 详情页的下载/预览/保存需要真实 https 链接，cloud:// 在这些 API 里不通用
// 同时处理 photoUrl（照片）和 avatarUrl（头像）
function resolveTempUrls(items) {
  const fields = ["photoUrl", "avatarUrl"];
  const ids = [];
  items.forEach((p) => {
    fields.forEach((f) => {
      if (p[f]) ids.push(p[f]);
    });
  });
  if (!ids.length) return Promise.resolve(items);

  return wx.cloud
    .getTempFileURL({ fileList: ids })
    .then((res) => {
      const map = {};
      (res.fileList || []).forEach((f) => {
        if (f.fileID) map[f.fileID] = f.tempFileURL;
      });
      items.forEach((p) => {
        // 照片：photoUrl(cloud://) → tempUrl(https)
        if (p.photoUrl) p.tempUrl = map[p.photoUrl] || "";
        // 头像：avatarUrl(cloud://) → avatarTempUrl(https)
        if (p.avatarUrl) p.avatarTempUrl = map[p.avatarUrl] || p.avatarUrl;
      });
      return items;
    })
    .catch((err) => {
      console.error("[api] getTempFileURL 失败", err);
      return items;
    });
}

// ====== 用户资料（users 集合，按 _openid 自动隔离） ======

// 查指定 openid 的资料（配合「所有人可读」权限，可看别人的）
function getProfileByOpenid(openid) {
  if (!openid) return Promise.resolve(null);
  return db()
    .collection(USERS)
    .where({ _openid: openid })
    .limit(1)
    .get()
    .then((res) => (res.data && res.data[0]) || null)
    .catch((err) => {
      console.warn("[api] getProfileByOpenid 失败（users 集合建了吗？）", err);
      return null;
    });
}

// 按账号记录 _id 查资料：同一台设备可能有多个账号（openid 相同），
// 看别人的主页必须用 ownerId 精确到账号，不能靠 openid 撞运气
function getProfileById(accountId) {
  if (!accountId) return Promise.resolve(null);
  return db()
    .collection(USERS)
    .doc(accountId)
    .get()
    .then((res) => res.data || null)
    .catch((err) => {
      console.warn("[api] getProfileById 失败", err);
      return null;
    });
}

// 查「我」的资料：不加 where，云开发权限会自动只返回 _openid == 当前用户的记录
// 这就是多用户隔离的关键证据 —— 换个账号登进来，这里返回的就是另一条
function getMyProfile() {
  return db()
    .collection(USERS)
    .limit(1)
    .get()
    .then((res) => (res.data && res.data[0]) || null)
    .catch((err) => {
      console.warn("[api] getMyProfile 失败（users 集合建了吗？）", err);
      return null;
    });
}

// 新增或更新我的资料
function saveMyProfile(data) {
  return getMyProfile().then((mine) => {
    if (mine && mine._id) {
      return db().collection(USERS).doc(mine._id).update({ data });
    }
    return db().collection(USERS).add({ data });
  });
}

// ====== 手机号登录（实验用，明文密码，生产环境必须 hash） ======

// 手机号注册：先查当前用户是否已有该手机号记录，没有则新增
// 返回新建的账号记录（含 _id，登录态要靠它标记 accountId）
function registerByPhone({ phone, password, nickName }) {
  return db()
    .collection(USERS)
    .where({ phone })
    .get()
    .then((res) => {
      if (res.data && res.data.length) {
        throw new Error("该手机号已注册，请直接登录");
      }
      return db()
        .collection(USERS)
        .add({
          data: {
            phone,
            password, // lab：明文；生产环境应用 SHA-256 或 bcrypt 存储
            nickName: nickName || "",
            loginMethod: "phone",
          },
        })
        .then((added) => ({
          _id: added._id,
          phone,
          nickName: nickName || "",
          loginMethod: "phone",
        }));
    });
}

// 手机号登录：云开发权限会自动按 _openid 过滤，所以只在「当前微信用户」范围内匹配
function loginByPhone({ phone, password }) {
  return db()
    .collection(USERS)
    .where({ phone, password })
    .limit(1)
    .get()
    .then((res) => {
      if (!res.data || !res.data.length) {
        throw new Error("手机号或密码错误");
      }
      return res.data[0];
    });
}

// ====== 收藏（favorites 集合，权限设「仅创建者可读写」） ======
// 记录结构：{ ownerId: 账号id, photoId: 照片_id, addDate }
// ownerId 与照片的归属口径一致：同一设备切换手机号账号时互不可见

// 是否已收藏
function isFavorited(accountId, photoId) {
  if (!accountId || !photoId) return Promise.resolve(false);
  return db()
    .collection(FAVS)
    .where({ ownerId: accountId, photoId })
    .limit(1)
    .get()
    .then((res) => !!(res.data && res.data.length))
    .catch(() => false);
}

// 收藏
function addFavorite(accountId, photoId) {
  return db().collection(FAVS).add({
    data: {
      ownerId: accountId,
      photoId,
      addDate: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    },
  });
}

// 取消收藏
function removeFavorite(accountId, photoId) {
  return db()
    .collection(FAVS)
    .where({ ownerId: accountId, photoId })
    .remove();
}

// 我的收藏记录（按收藏时间倒序）
function listMyFavorites(accountId) {
  if (!accountId) return Promise.resolve({ data: [] });
  return db()
    .collection(FAVS)
    .where({ ownerId: accountId })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
}

// 按 _id 批量取照片（云数据库没有 join，收藏列表先查记录再查照片）
function getPhotosByIds(ids) {
  if (!ids.length) return Promise.resolve({ data: [] });
  const _ = db().command;
  return db()
    .collection(COLLECTION)
    .where({ _id: _.in(ids) })
    .limit(50)
    .get();
}

module.exports = {
  getOpenId,
  listPhotos,
  listMyPhotos,
  getPhoto,
  addPhoto,
  deletePhoto,
  isFavorited,
  addFavorite,
  removeFavorite,
  listMyFavorites,
  getPhotosByIds,
  uploadFile,
  uploadPhoto,
  uploadAvatar,
  resolveTempUrls,
  getProfileByOpenid,
  getProfileById,
  getMyProfile,
  saveMyProfile,
  registerByPhone,
  loginByPhone,
};
