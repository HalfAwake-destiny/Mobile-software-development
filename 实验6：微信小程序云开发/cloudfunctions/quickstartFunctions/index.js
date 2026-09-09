const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const COLLECTION = "photos";

// ====== 获取 openid ======
// openid 是用户在小程序里的唯一身份标识，前端拿不到，
// 只能在云函数里通过 cloud.getWXContext() 取，这是云开发里唯一必须走服务端的东西。
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// ====== 云函数入口 ======
// 前端调用方式：
//   wx.cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'getOpenId' } })
exports.main = async (event) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();

    default:
      return { errMsg: "unknown type: " + event.type };
  }
};
