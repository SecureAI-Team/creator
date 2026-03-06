const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    insights: [],
    summary: '',
    summaryLoading: false,
  },

  onShow() {
    this.loadInsights();
  },

  async loadInsights() {
    this.setData({ loading: true });
    try {
      const data = await api.getInsights();
      this.setData({ insights: data.insights || [], loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },

  async onGenerateSummary() {
    this.setData({ summaryLoading: true });
    try {
      const data = await api.getInsightSummary();
      this.setData({ summary: data.content || '暂无摘要', summaryLoading: false });
    } catch {
      this.setData({ summary: '生成摘要失败', summaryLoading: false });
    }
  },

  async onDismiss(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.dismissInsight(id);
      this.setData({
        insights: this.data.insights.filter(i => i.id !== id),
      });
    } catch {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },
});
