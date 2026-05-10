// daily.js

Page({
  data: {
    scenes: []
  },

  onLoad() {
    wx.cloud.init({ traceUser: true })
    this.loadScenes()
  },

  async loadScenes() {
    const db = wx.cloud.database()
    
    // 场景配置
    const sceneMap = {
      'elevator': { name: '电梯偶遇', icon: '🚪' },
      'pantry': { name: '茶水间闲聊', icon: '☕' },
      'canteen': { name: '食堂搭话', icon: '🍜' },
      'corridor': { name: '走廊相遇', icon: '🚶' },
      'meeting': { name: '会议发言', icon: '📝' },
      'lunch': { name: '午饭邀约', icon: '🍽️' },
      'dining': { name: '商务餐', icon: '🍴' }
    }
    
    try {
      // 获取每个场景的题目数量
      const scenes = []
      
      for (const [id, config] of Object.entries(sceneMap)) {
        const countResult = await db.collection('questions')
          .where({ module: 'daily', scene: id })
          .count()
        scenes.push({ id, ...config, count: countResult.total })
      }
      
      this.setData({ scenes })
    } catch (err) {
      console.error('加载场景失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    
    wx.navigateTo({
      url: `/pages/practice/practice?module=daily&scene=${scene}`
    })
  }
})
