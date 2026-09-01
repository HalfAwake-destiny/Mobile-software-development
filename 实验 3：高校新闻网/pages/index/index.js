const common = require('../../utils/common.js')

Page({
  data: {
    swiperImg: [
      { id: '264698', src: '/images/newsimage1.jpg', category: '校园', title: '省退役军人事务厅来校交流对接工作', date: '08-19' },
      { id: '304083', src: '/images/newsimage2.jpg', category: '学术', title: '《光明日报》刊发我校研究员理论文章', date: '08-09' },
      { id: '305670', src: '/images/newsimage3.jpg', category: '创新', title: '我校在大学生创新创业大赛再创佳绩', date: '08-11' }
    ],
    categories: ['全部', '校园', '学术', '创新'],
    activeCategory: '全部',
    allNews: [],
    newsList: [],
    keyword: '',
    selectedDate: '',
    minDate: '',
    maxDate: ''
  },

  onLoad() {
    const newsList = common.getNewsList()
    const swiperImg = newsList.slice(0, 3).map(item => ({
      id: item.id,
      src: item.poster,
      category: item.category,
      title: item.title,
      date: item.add_date.slice(5)
    }))
    const dates = newsList.map(item => item.add_date).sort()
    this.setData({
      allNews: newsList,
      newsList,
      swiperImg,
      minDate: dates[0] || '',
      maxDate: dates[dates.length - 1] || ''
    })
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) tabBar.setData({ selected: 0 })
  },

  selectCategory(e) {
    const { category } = e.currentTarget.dataset
    this.setData({ activeCategory: category }, () => this.applyFilters())
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.applyFilters())
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => this.applyFilters())
  },

  selectDate(e) {
    this.setData({ selectedDate: e.detail.value }, () => this.applyFilters())
  },

  clearDate() {
    this.setData({ selectedDate: '' }, () => this.applyFilters())
  },

  applyFilters() {
    const { allNews, activeCategory, keyword, selectedDate } = this.data
    const query = keyword.trim().toLowerCase()
    const newsList = allNews.filter(item => {
      if (activeCategory !== '全部' && item.category !== activeCategory) return false
      if (selectedDate && item.add_date !== selectedDate) return false
      if (!query) return true
      const detail = common.getNewsDetail(item.id).news || {}
      return [item.title, item.source, item.category, detail.content]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    })
    this.setData({ newsList })
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `../detail/detail?id=${id}` })
  }
})
