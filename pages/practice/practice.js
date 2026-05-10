// practice.js
const questions = require('../../data/questions.js')

Page({
  data: {
    module: '',
    questionId: '',
    question: null,
    selectedKey: null,
    showResult: false,
    selectedOption: null,
    scoreClass: '',
    scoreDesc: ''
  },

  onLoad(options) {
    const { module, questionId } = options
    this.setData({ module, questionId })
    
    // 查找题目
    const questionList = questions[module]
    const question = questionList.find(q => q.id === questionId)
    
    if (question) {
      // 选项乱序
      const shuffledOptions = this.shuffleArray([...question.options])
      const shuffledQuestion = { ...question, options: shuffledOptions }
      this.setData({ question: shuffledQuestion })
    } else {
      wx.showToast({
        title: '题目加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // Fisher-Yates 洗牌算法
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
    return array
  },

  selectOption(e) {
    const key = e.currentTarget.dataset.key
    if (this.data.showResult) return
    this.setData({ selectedKey: key })
  },

  confirmSelection() {
    if (!this.data.selectedKey) return
    
    const selectedOption = this.data.question.options.find(
      opt => opt.key === this.data.selectedKey
    )
    
    let scoreClass = 'low'
    let scoreDesc = ''
    
    if (selectedOption.score >= 8) {
      scoreClass = 'high'
      scoreDesc = '优秀！高情商/逻辑清晰的表达'
    } else if (selectedOption.score >= 5) {
      scoreClass = 'mid'
      scoreDesc = '及格，但有提升空间'
    } else {
      scoreDesc = '需要改进，注意分析原因'
    }
    
    this.setData({
      selectedOption,
      showResult: true,
      scoreClass,
      scoreDesc
    })
  },

  goBack() {
    const pageStack = getCurrentPages()
    if (pageStack.length > 2) {
      wx.navigateBack()
    } else {
      wx.redirectTo({
        url: this.data.module === 'daily' 
          ? '/pages/daily/daily' 
          : '/pages/workplace/workplace'
      })
    }
  },

  nextQuestion() {
    const module = this.data.module
    const currentId = this.data.questionId
    const questionList = questions[module]
    
    // 找到下一个题目（避免重复）
    let nextIndex = Math.floor(Math.random() * questionList.length)
    let attempts = 0
    
    while (questionList[nextIndex].id === currentId && attempts < 10) {
      nextIndex = Math.floor(Math.random() * questionList.length)
      attempts++
    }
    
    const nextQuestion = questionList[nextIndex]
    // 选项乱序
    const shuffledOptions = this.shuffleArray([...nextQuestion.options])
    const shuffledQuestion = { ...nextQuestion, options: shuffledOptions }
    
    this.setData({
      question: shuffledQuestion,
      questionId: nextQuestion.id,
      selectedKey: null,
      showResult: false,
      selectedOption: null,
      scoreClass: '',
      scoreDesc: ''
    })
    
    // 滚动到顶部
    wx.pageScrollTo({ scrollTop: 0 })
  }
})
