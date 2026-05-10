// index.js
Page({
  data: {},

  goToDaily() {
    wx.navigateTo({
      url: '/pages/daily/daily'
    })
  },

  goToWorkplace() {
    wx.navigateTo({
      url: '/pages/workplace/workplace'
    })
  },

  goToAIExpand() {
    wx.navigateTo({
      url: '/pages/ai-expand/ai-expand'
    })
  }
})
