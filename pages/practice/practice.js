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
      // 选项乱序并重新分配 key
      const shuffledQuestion = this.shuffleOptions(question)
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

  // Fisher-Yates 洗牌算法 + 重新分配 key
  shuffleOptions(question) {
    const originalOptions = [...question.options]
    
    // 记录每个选项的实际分数（按原始分数排序）
    const sortedByScore = [...originalOptions].sort((a, b) => b.score - a.score)
    
    // 打乱内容顺序
    const shuffledContent = this.shuffleArray(originalOptions.map(opt => opt.content))
    
    // 随机分配内容给不同位置
    const keys = ['A', 'B', 'C', 'D']
    
    // 方法：随机决定每个分数放在哪个位置
    // 确保高分内容不一定在特定位置
    const scorePositions = this.shuffleArray([0, 1, 2, 3])
    
    // 按打乱后的位置分配内容，但让内容顺序随机
    const shuffledContentFinal = this.shuffleArray(shuffledContent)
    
    // 重新构建选项：新内容 + 原始分数/分析
    const newOptions = shuffledContentFinal.map((content, index) => {
      // 找到这个内容对应的原始选项，保留其分数和分析
      const original = originalOptions.find(opt => opt.content === content)
      return {
        key: keys[index],
        content: content,
        score: original.score,
        analysis: original.analysis
      }
    })
    
    return { ...question, options: newOptions }
  },

  // Fisher-Yates 洗牌算法
  shuffleArray(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
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
    // 选项乱序并重新分配 key
    const shuffledQuestion = this.shuffleOptions(nextQuestion)
    
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
