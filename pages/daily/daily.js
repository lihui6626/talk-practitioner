// daily.js
const questions = require('../../data/questions.js')

Page({
  data: {
    scenes: [
      { id: 'elevator', name: '电梯偶遇', icon: '🚪', count: 2 },
      { id: 'pantry', name: '茶水间闲聊', icon: '☕', count: 2 },
      { id: 'canteen', name: '食堂搭话', icon: '🍜', count: 2 },
      { id: 'corridor', name: '走廊相遇', icon: '🚶', count: 2 }
    ]
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    const sceneQuestions = questions.daily.filter(q => q.scene === scene)
    
    // 随机选择一题
    const randomIndex = Math.floor(Math.random() * sceneQuestions.length)
    const question = sceneQuestions[randomIndex]
    
    wx.navigateTo({
      url: `/pages/practice/practice?module=daily&questionId=${question.id}`
    })
  }
})
