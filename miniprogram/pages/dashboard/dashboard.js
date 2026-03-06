const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    timeRange: 7,
    metrics: null,
  },

  onShow() {
    this.loadMetrics();
  },

  async loadMetrics() {
    this.setData({ loading: true });
    try {
      const data = await api.getMetrics(this.data.timeRange);
      this.setData({ metrics: data, loading: false });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onTimeRangeChange(e) {
    const days = [7, 30, 90][e.detail.value];
    this.setData({ timeRange: days });
    this.loadMetrics();
  },
});
