const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    items: [],
    total: 0,
  },

  onShow() {
    this.loadReviews();
  },

  async loadReviews() {
    this.setData({ loading: true });
    try {
      const data = await api.getPendingReviews();
      this.setData({
        items: data.items || [],
        total: data.total || 0,
        loading: false,
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  async onApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认通过',
      content: '确认通过此内容？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.approveContent(id);
            wx.showToast({ title: '已通过', icon: 'success' });
            this.loadReviews();
          } catch {
            wx.showToast({ title: '操作失败', icon: 'error' });
          }
        }
      },
    });
  },

  async onReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '打回修改',
      content: '确认打回此内容？',
      editable: true,
      placeholderText: '请输入打回原因（可选）',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.rejectContent(id, res.content || '');
            wx.showToast({ title: '已打回', icon: 'success' });
            this.loadReviews();
          } catch {
            wx.showToast({ title: '操作失败', icon: 'error' });
          }
        }
      },
    });
  },
});
