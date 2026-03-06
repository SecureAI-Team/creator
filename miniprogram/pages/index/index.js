const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    loggedIn: false,
    overview: null,
    pendingCount: 0,
  },

  onLoad() {
    const app = getApp();
    this.setData({ loggedIn: !!app.globalData.token });
    if (app.globalData.token) this.loadData();
  },

  onShow() {
    if (getApp().globalData.token) this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [overview, reviews] = await Promise.all([
        api.getOverview(),
        api.getPendingReviews(),
      ]);
      this.setData({
        overview,
        pendingCount: reviews.total || 0,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/index/login' });
  },

  goReview() {
    wx.switchTab({ url: '/pages/review/review' });
  },

  goDashboard() {
    wx.switchTab({ url: '/pages/dashboard/dashboard' });
  },

  goInsights() {
    wx.switchTab({ url: '/pages/insights/insights' });
  },
});
