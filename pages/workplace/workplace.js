// workplace.js
const questions = require('../../data/questions.js')

Page({
  data: {
    scenes: []
  },

  onLoad() {
    const sceneMap = {
      'report': { name: '向上汇报', icon: '📊' },
      'review': { name: '需求评审', icon: '📋' },
      'interview': { name: '面试追问', icon: '🎯' },
      'cross-team': { name: '跨部门协作', icon: '🤝' }
    }
    
    const scenes = Object.entries(sceneMap).map(([id, config]) => {
      const count = questions.workplace.filter(q => q.scene === id).length
      return { id, ...config, count }
    })
    
    this.setData({ scenes })
  },

  selectScene(e) {
    const scene = e.currentTarget.dataset.scene
    const sceneQuestions = questions.workplace.filter(q => q.scene === scene)
    
    if (sceneQuestions.length === 0) {
      wx.showToast({ title: '该场景暂无题目', icon: 'none' })
      return
    }
    
    // 随机选择一题
    const randomIndex = Math.floor(Math.random() * sceneQuestions.length)
    const question = sceneQuestions[randomIndex]
    
    wx.navigateTo({
      url: `/pages/practice/practice?module=workplace&questionId=${question.id}`
    })
  }
})
