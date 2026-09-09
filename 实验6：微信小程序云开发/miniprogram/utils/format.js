// utils/format.js
// 工具函数：日期格式化、地点拼接

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatDate(d) {
  d = d instanceof Date ? d : new Date(d);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function formatDateTime(d) {
  d = d instanceof Date ? d : new Date(d);
  return formatDate(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// "Anhui, China" 或 "China"
function formatLocation(photo) {
  const parts = [photo.province, photo.country].filter(Boolean);
  return parts.join(", ") || "未知地点";
}

module.exports = { formatDate, formatDateTime, formatLocation };
