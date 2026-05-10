// daily.js
const questions = require('../../data/questions.js')

Page({
  data: {
    scenes: []
  },

  onLoad() {
    console.log('questions.daily length:', questions.daily.length)

    // 统计每个场景的题目数量
    const sceneMap = {
      'elevator': { name: '电梯偶遇', icon: '🚪' },
      'pantry': { name: '茶水间闲聊', icon: '☕' },
      'canteen': { name: '食堂搭话', icon: '🍜' },
      'corridor': { name: '走廊相遇', icon: '🚶' },
      'meeting': { name: '会议发言', icon: '📝' },
      'lunch': { name: '午饭邀约', icon: '🍽️' },
      'dining': { name: '商务餐', icon: '🍴' }
    }
    
    const scenes = Object.entries(sceneMap).map(([id, config]) => {
      const count = questions.daily.filter(q => q.scene === id).length
      return { id, ...config, count }
    })
    console.log('scenes:', scenes)
    this.setData({ scenes })
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    const sceneQuestions = questions.daily.filter(q => q.scene === scene)
    
    if (sceneQuestions.length === 0) {
      wx.showToast({ title: '该场景暂无题目', icon: 'none' })
      return
    }
    
    // 随机选择一题
    const randomIndex = Math.floor(Math.random() * sceneQuestions.length)
    const question = sceneQuestions[randomIndex]
    
    wx.navigateTo({
      url: `/pages/practice/practice?module=daily&questionId=${question.id}`
    })
  }
})
