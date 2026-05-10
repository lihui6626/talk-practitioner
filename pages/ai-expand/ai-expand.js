// AI每次生成的题目数量（可调整）
const AI_GENERATE_COUNT = 1

// 赞助金额（单位：元）
const SPONSOR_AMOUNT = 0.99

const scenesDaily = [
  { id: 'elevator', name: '电梯偶遇', icon: '🚪' },
  { id: 'pantry', name: '茶水间闲聊', icon: '☕' },
  { id: 'canteen', name: '食堂搭话', icon: '🍜' },
  { id: 'corridor', name: '走廊相遇', icon: '🚶' }
]

const scenesWorkplace = [
  { id: 'report', name: '向上汇报', icon: '📊' },
  { id: 'review', name: '需求评审', icon: '📋' },
  { id: 'interview', name: '面试追问', icon: '🎯' },
  { id: 'cross-team', name: '跨部门协作', icon: '🤝' }
]

Page({
  data: {
    activeTab: 'daily',
    dailyScenes: scenesDaily,
    workplaceScenes: scenesWorkplace,
    selectedScene: null,
    isGenerating: false,
    generatedCount: 0,
    message: '',
    aiGenerateCount: AI_GENERATE_COUNT,
    sponsorAmount: SPONSOR_AMOUNT
  },

  onLoad() {
    // 初始化云开发（使用动态环境）
    wx.cloud.init({
      traceUser: true
    })
    this.loadStats()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, selectedScene: null, message: '' })
    this.loadStats()
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    this.setData({ selectedScene: scene, message: '' })
  },

  async loadStats() {
    const db = wx.cloud.database()
    const { activeTab } = this.data
    
    try {
      const sceneList = activeTab === 'daily' ? scenesDaily : scenesWorkplace
      const stats = []
      
      for (const scene of sceneList) {
        const count = await db.collection('questions')
          .where({ module: activeTab, scene: scene.id })
          .count()
        stats.push({ id: scene.id, count: count.total })
      }
      
      this.setData({
        dailyStats: scenesDaily.map((s, i) => ({ ...s, count: stats[i].count })),
        workplaceStats: scenesWorkplace.map((s, i) => ({ ...s, count: stats[i].count }))
      })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  async generateQuestions() {
    const { activeTab, selectedScene, isGenerating } = this.data
    
    if (!selectedScene) {
      wx.showToast({ title: '请先选择场景', icon: 'none' })
      return
    }
    
    if (isGenerating) return
    
    wx.showModal({
      title: '确认生成',
      content: `确定要为"${this.getSceneName(selectedScene)}"场景生成${AI_GENERATE_COUNT}道AI题目吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.doGenerate()
        }
      }
    })
  },

  async doGenerate() {
    const { activeTab, selectedScene } = this.data
    
    this.setData({ isGenerating: true, message: 'AI正在生成题目...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'generateQuestions',
        data: { module: activeTab, scene: selectedScene }
      })
      
      if (result.result.success) {
        this.setData({
          message: `成功生成${result.result.count}道题目！`,
          generatedCount: result.result.count
        })
        wx.showToast({ title: '生成成功', icon: 'success' })
        this.loadStats()
      } else {
        this.setData({ message: result.result.message })
        wx.showToast({ title: '生成需要配置AI', icon: 'none' })
      }
    } catch (err) {
      console.error('调用失败', err)
      this.setData({ message: '网络错误，请重试' })
      wx.showToast({ title: '调用失败', icon: 'none' })
    } finally {
      this.setData({ isGenerating: false })
    }
  },

  getSceneName(sceneId) {
    const allScenes = [...scenesDaily, ...scenesWorkplace]
    const scene = allScenes.find(s => s.id === sceneId)
    return scene ? scene.name : sceneId
  },

  goBack() {
    wx.navigateBack()
  },

  // 赞助功能
  async sponsor() {
    const amount = this.data.sponsorAmount

    wx.showModal({
      title: '确认赞助',
      content: `确定赞助 ¥${amount} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.doSponsor(amount)
        }
      }
    })
  },

  async doSponsor(amount) {
    wx.showLoading({ title: '正在调起支付...' })

    try {
      // 调用云函数获取支付参数
      const result = await wx.cloud.callFunction({
        name: 'sponsor',
        data: { totalFee: Math.round(amount * 100) } // 转换为分
      })

      wx.hideLoading()

      if (result.result.success) {
        // 调起微信支付
        const paymentResult = await wx.requestPayment({
          timeStamp: result.result.timeStamp,
          nonceStr: result.result.nonceStr,
          package: `prepay_id=${result.result.prepayId}`,
          signType: 'RSA',
          paySign: result.result.sign
        })

        if (paymentResult.errMsg === 'requestPayment:ok') {
          wx.showToast({ title: '感谢您的赞助！', icon: 'success' })
        }
      } else {
        wx.showToast({ title: result.result.message || '支付失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('赞助失败:', err)
      wx.showToast({ title: '支付失败，请重试', icon: 'none' })
    }
  }
})