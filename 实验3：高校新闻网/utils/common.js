const news = [
  ['264698', '校园', '校园新闻中心', '省退役军人事务厅来校交流对接工作', 'campus-01.jpg', '2022-08-19'],
  ['264699', '校园', '学生工作处', '新学期校园服务保障工作全面启动', 'campus-02.jpg', '2022-08-18'],
  ['264700', '校园', '校团委', '海风音乐节在崂山校区精彩开幕', 'campus-03.jpg', '2022-08-16'],
  ['264701', '校园', '后勤保障处', '智慧食堂上线带来校园生活新体验', 'campus-04.jpg', '2022-08-14'],
  ['304083', '学术', '党委宣传部', '《光明日报》刊发我校研究员理论文章', 'campus-05.jpg', '2022-08-09'],
  ['304084', '学术', '科学技术处', '学校发布深海观测研究最新成果', 'campus-06.jpg', '2022-08-08'],
  ['304085', '学术', '研究生院', '青年学者论坛聚焦海洋科技前沿', 'campus-07.jpg', '2022-08-06'],
  ['304086', '学术', '国际合作处', '中外专家共同研讨蓝色经济发展', 'campus-08.jpg', '2022-08-04'],
  ['305670', '创新', '创新创业学院', '我校在大学生创新创业大赛再创佳绩', 'campus-09.jpg', '2022-08-11'],
  ['305671', '创新', '信息科学与工程学部', '学生团队推出校园智能导航小程序', 'campus-10.jpg', '2022-08-10'],
  ['305672', '创新', '工程训练中心', '机器人战队全国邀请赛斩获一等奖', 'campus-11.jpg', '2022-08-07'],
  ['305673', '创新', '就业创业指导中心', '大学生创业项目对接会举行', 'campus-12.jpg', '2022-08-03']
].map(([id, category, source, title, image, add_date], index) => ({
  id,
  category,
  source,
  title,
  poster: `/images/${image}`,
  add_date,
  content: index === 0
    ? '8月19日，省退役军人事务厅一行来校，就联合共建退役军人学院事宜进行交流对接。学校有关部门负责同志参加会议。\n\n会上，学校介绍了人才培养、学科建设、科学研究和社会服务等方面的基本情况。双方围绕学历提升、职业技能认证、创新创业指导和心理健康服务等内容进行了深入交流。\n\n与会人员认为，课程设计应坚持需求导向，结合区域产业发展需要，采用课堂讲授、案例分析、企业实践和线上学习相结合的方式。\n\n下一步，双方将细化建设方案和任务清单，持续拓展服务社会的新路径，为退役军人高质量就业和个人发展提供更有力的教育支持。'
    : `${title}近日受到师生广泛关注。相关部门围绕项目背景、实施过程和下一阶段安排进行了详细介绍。\n\n活动坚持面向师生实际需求，充分整合校内外资源，通过专题交流、实践展示和协同合作等形式，为校园发展注入新的活力。参与师生表示，此次活动内容充实、组织有序，不仅拓宽了视野，也增强了参与校园建设的责任感。\n\n学校将继续完善长效机制，及时总结经验，推动相关成果转化应用，为人才培养、科学研究和校园文化建设提供更加有力的支撑。`
}))

const FAVORITE_PREFIX = 'favorite:'
const USER_PROFILE_KEY = 'user-profile'
const USER_SESSION_KEY = 'user-session'
const HISTORY_KEY = 'reading-history'
const SETTINGS_KEY = 'reading-settings'

function hydrate(item) {
  const latest = news.find(article => article.id === item.id) || {}
  return { ...item, ...latest, viewedAt: item.viewedAt }
}

function getNewsList() {
  return news.map(({ content, ...item }) => item)
}

function getNewsDetail(id) {
  const article = news.find(item => item.id === String(id))
  return article ? { code: '200', news: article } : { code: '404', news: {} }
}

function getRelatedNews(id, category) {
  return getNewsList().filter(item => item.category === category && item.id !== id).slice(0, 3)
}

function getFavoriteKey(id) { return `${FAVORITE_PREFIX}${id}` }

function getFavorites() {
  const { keys = [] } = wx.getStorageInfoSync()
  return keys.filter(key => key.indexOf(FAVORITE_PREFIX) === 0)
    .map(key => wx.getStorageSync(key)).filter(item => item && item.id).map(hydrate)
}

function removeFavorites(ids) {
  ids.forEach(id => wx.removeStorageSync(getFavoriteKey(id)))
}

function addHistory(article) {
  const current = wx.getStorageSync(HISTORY_KEY) || []
  const next = [{ ...article, viewedAt: Date.now() }, ...current.filter(item => item.id !== article.id)].slice(0, 30)
  wx.setStorageSync(HISTORY_KEY, next)
}

function getHistory() {
  return (wx.getStorageSync(HISTORY_KEY) || []).map(hydrate)
}

function clearHistory() { wx.removeStorageSync(HISTORY_KEY) }

function getReadingSettings() {
  return { fontSize: 'medium', darkMode: false, ...(wx.getStorageSync(SETTINGS_KEY) || {}) }
}

function saveReadingSettings(settings) { wx.setStorageSync(SETTINGS_KEY, settings) }
function saveUserProfile(info) { wx.setStorageSync(USER_PROFILE_KEY, { avatarUrl: info.avatarUrl, nickName: info.nickName }) }
function getUserProfile() { const info = wx.getStorageSync(USER_PROFILE_KEY); return info && info.avatarUrl && info.nickName ? info : null }
function clearUserProfile() { wx.removeStorageSync(USER_PROFILE_KEY) }
function startUserSession() { wx.setStorageSync(USER_SESSION_KEY, true) }
function endUserSession() { wx.setStorageSync(USER_SESSION_KEY, false) }
function isUserLoggedIn() {
  const state = wx.getStorageSync(USER_SESSION_KEY)
  if (state === true) return true
  if (state === false) return false

  // Migrate profiles saved before login state was stored separately.
  if (getUserProfile()) {
    startUserSession()
    return true
  }
  return false
}

module.exports = {
  getNewsList, getNewsDetail, getRelatedNews, getFavoriteKey, getFavorites, removeFavorites,
  addHistory, getHistory, clearHistory, getReadingSettings, saveReadingSettings,
  saveUserProfile, getUserProfile, clearUserProfile,
  startUserSession, endUserSession, isUserLoggedIn
}
