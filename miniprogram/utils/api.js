const app = getApp();

module.exports = {
  getOverview() {
    return app.request('/api/data?days=7');
  },

  getPendingReviews() {
    return app.request('/api/content?status=REVIEWING&pageSize=50');
  },

  approveContent(id) {
    return app.request(`/api/content`, {
      method: 'PUT',
      data: { id, status: 'ADAPTED' },
    });
  },

  rejectContent(id, reason) {
    return app.request(`/api/content`, {
      method: 'PUT',
      data: { id, status: 'DRAFT', rejectReason: reason },
    });
  },

  getInsights() {
    return app.request('/api/data/insights');
  },

  getInsightSummary() {
    return app.request('/api/data/insights/summary', {
      method: 'POST',
      data: { type: 'summary' },
    });
  },

  getMetrics(days = 7) {
    return app.request(`/api/data/metrics?days=${days}`);
  },

  dismissInsight(id) {
    return app.request('/api/data/insights', {
      method: 'PATCH',
      data: { id },
    });
  },
};
