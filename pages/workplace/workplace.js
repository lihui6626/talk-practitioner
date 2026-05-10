// workplace.js

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
      'report': { name: '向上汇报', icon: '📊' },
      'review': { name: '需求评审', icon: '📋' },
      'interview': { name: '面试追问', icon: '🎯' },
      'cross-team': { name: '跨部门协作', icon: '🤝' }
    }
    
    try {
      const scenes = []
      
      for (const [id, config] of Object.entries(sceneMap)) {
        const countResult = await db.collection('questions')
          .where({ module: 'workplace', scene: id })
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
      url: `/pages/practice/practice?module=workplace&scene=${scene}`
    })
  }
})
