App({
  globalData: {
    serverUrl: '',
    token: '',
    userInfo: null,
  },

  onLaunch() {
    const serverUrl = wx.getStorageSync('serverUrl');
    const token = wx.getStorageSync('token');
    if (serverUrl) this.globalData.serverUrl = serverUrl;
    if (token) this.globalData.token = token;
  },

  request(path, options = {}) {
    const { serverUrl, token } = this.globalData;
    if (!serverUrl || !token) {
      return Promise.reject(new Error('未登录'));
    }
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${serverUrl}${path}`,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.header,
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(res.data?.error || `HTTP ${res.statusCode}`));
          }
        },
        fail(err) {
          reject(err);
        },
      });
    });
  },
});
