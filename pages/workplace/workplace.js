// workplace.js
const questions = require('../../data/questions.js')

Page({
  data: {
    scenes: [
      { id: 'report', name: '向上汇报', icon: '📊', count: 2 },
      { id: 'review', name: '需求评审', icon: '📋', count: 2 },
      { id: 'interview', name: '面试追问', icon: '🎯', count: 2 },
      { id: 'cross-team', name: '跨部门协作', icon: '🤝', count: 2 }
    ]
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    const sceneQuestions = questions.workplace.filter(q => q.scene === scene)
    
    // 随机选择一题
    const randomIndex = Math.floor(Math.random() * sceneQuestions.length)
    const question = sceneQuestions[randomIndex]
    
    wx.navigateTo({
      url: `/pages/practice/practice?module=workplace&questionId=${question.id}`
    })
  }
})
