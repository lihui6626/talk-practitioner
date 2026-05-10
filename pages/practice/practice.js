// practice.js

// AI每次生成的题目数量（可调整）
const AI_GENERATE_COUNT = 1

Page({
  data: {
    module: '',
    scene: '',
    questionId: '',
    question: null,
    selectedKey: null,
    showResult: false,
    selectedOption: null,
    scoreClass: '',
    scoreDesc: '',
    totalQuestions: 0,
    doneCount: 0,
    isAllDone: false,
    isGeneratingAI: false,
    usedQuestionIds: []
  },

  onLoad(options) {
    wx.cloud.init({ traceUser: true })
    const { module, questionId, scene } = options
    this.setData({ module, questionId, scene, usedQuestionIds: [] })
    
    if (questionId) {
      this.loadQuestionById(questionId)
    } else if (scene) {
      this.loadRandomQuestion(scene)
    }
  },

  async loadQuestionById(questionId) {
    const db = wx.cloud.database()
    try {
      const result = await db.collection('questions').doc(questionId).get()
      if (result.data) {
        const shuffledQuestion = this.shuffleOptions(result.data)
        this.setData({ 
          question: shuffledQuestion, 
          questionId,
          usedQuestionIds: [questionId]
        })
      }
    } catch (err) {
      console.error('加载题目失败:', err)
      wx.showToast({ title: '题目加载失败', icon: 'none' })
    }
  },

  async loadRandomQuestion(scene) {
    const db = wx.cloud.database()
    const { module, usedQuestionIds } = this.data
    
    try {
      const countResult = await db.collection('questions')
        .where({ module, scene })
        .count()
      
      this.setData({ totalQuestions: countResult.total })
      
      if (countResult.total === 0) {
        wx.showToast({ title: '该场景暂无题目', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      
      // 随机获取一个题目（避免重复）
      let result
      let attempts = 0
      do {
        const skip = Math.floor(Math.random() * countResult.total)
        result = await db.collection('questions')
          .where({ module, scene })
          .skip(skip)
          .limit(1)
          .get()
        attempts++
      } while (usedQuestionIds.includes(result.data[0]?._id) && attempts < 10)
      
      if (result.data.length > 0) {
        const q = result.data[0]
        const shuffledQuestion = this.shuffleOptions(q)
        this.setData({ 
          question: shuffledQuestion, 
          questionId: q._id,
          usedQuestionIds: [...usedQuestionIds, q._id],
          doneCount: usedQuestionIds.length
        })
      }
    } catch (err) {
      console.error('加载题目失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // Fisher-Yates 洗牌算法 + 重新分配 key
  shuffleOptions(question) {
    const originalOptions = [...question.options]
    const shuffledContent = this.shuffleArray(originalOptions.map(opt => opt.content))
    const keys = ['A', 'B', 'C', 'D']
    
    const newOptions = shuffledContent.map((content, index) => {
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

  async nextQuestion() {
    const { module, scene, questionId, usedQuestionIds } = this.data
    const db = wx.cloud.database()
    
    try {
      const countResult = await db.collection('questions')
        .where({ module, scene })
        .count()
      
      this.setData({ totalQuestions: countResult.total })
      
      // 获取所有未做过的题目
      const allQuestions = await db.collection('questions')
        .where({ module, scene })
        .get()
      
      const availableQuestions = allQuestions.data.filter(q => !usedQuestionIds.includes(q._id))
      
      if (availableQuestions.length === 0) {
        // 所有题目都做完了
        this.setData({ isAllDone: true })
        return
      }
      
      // 随机选一个
      const randomIndex = Math.floor(Math.random() * availableQuestions.length)
      const nextQ = availableQuestions[randomIndex]
      const shuffledQuestion = this.shuffleOptions(nextQ)
      
      this.setData({
        question: shuffledQuestion,
        questionId: nextQ._id,
        selectedKey: null,
        showResult: false,
        selectedOption: null,
        scoreClass: '',
        scoreDesc: '',
        usedQuestionIds: [...usedQuestionIds, nextQ._id],
        doneCount: usedQuestionIds.length + 1
      })
      
      wx.pageScrollTo({ scrollTop: 0 })
    } catch (err) {
      console.error('加载下一题失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // AI 扩展题库
  async expandWithAI() {
    const { module, scene, totalQuestions } = this.data
    
    wx.showModal({
      title: 'AI 扩展题库',
      content: `当前场景已完成 ${totalQuestions} 道题目，是否让 AI 为你生成更多练习题目？`,
      confirmText: '生成',
      cancelText: '返回',
      success: async (res) => {
        if (res.confirm) {
          this.generateAIQuestions()
        } else {
          this.goBack()
        }
      }
    })
  },

  async generateAIQuestions() {
    const { module, scene } = this.data
    
    this.setData({ isGeneratingAI: true })
    wx.showLoading({ title: 'AI 正在生成题目...' })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'generateQuestions',
        data: { module, scene, count: AI_GENERATE_COUNT }
      })
      
      wx.hideLoading()
      
      if (result.result.success) {
        // 从数据库获取刚生成的题目
        const db = wx.cloud.database()
        const allQuestions = await db.collection('questions')
          .where({ module, scene, isAIGenerated: true })
          .orderBy('createdAt', 'desc')
          .limit(AI_GENERATE_COUNT)
          .get()
        
        if (allQuestions.data.length >= AI_GENERATE_COUNT) {
          const aiQuestions = allQuestions.data.slice(0, AI_GENERATE_COUNT).map((q, i) => {
            const shuffledQ = this.shuffleOptions({
              ...q,
              situation: `${q.situation} (AI题${i + 1}/${AI_GENERATE_COUNT})`
            })
            return shuffledQ
          })
          
          // 保存AI题目列表
          this.setData({
            aiQuestionList: aiQuestions,
            aiCurrentIndex: 0,
            isGeneratingAI: false
          })
          
          // 询问用户是否开始练习
          wx.showModal({
            title: '生成成功！',
            content: `AI已生成${AI_GENERATE_COUNT}道新题目，是否开始练习？`,
            confirmText: '开始练习',
            cancelText: '返回',
            success: (res) => {
              if (res.confirm) {
                this.startAIQuestions()
              } else {
                this.goBack()
              }
            }
          })
        } else {
          this.setData({ isGeneratingAI: false })
          wx.showToast({ title: '获取题目失败', icon: 'none' })
        }
      } else {
        this.setData({ isGeneratingAI: false })
        wx.showToast({ title: result.result.message || '生成失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ isGeneratingAI: false })
      console.error('AI 生成失败:', err)
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  },

  // 开始练习AI生成的题目
  async startAIQuestions() {
    const { aiQuestionList, module, scene } = this.data
    
    if (aiQuestionList && aiQuestionList.length > 0) {
      // 从数据库获取该场景的真实题目总数
      const db = wx.cloud.database()
      const countResult = await db.collection('questions')
        .where({ module, scene })
        .count()
      
      this.setData({
        question: aiQuestionList[0],
        questionId: aiQuestionList[0]._id,
        aiCurrentIndex: 0,
        usedQuestionIds: [aiQuestionList[0]._id],
        doneCount: 0,
        totalQuestions: countResult.total,
        isAllDone: false,
        selectedKey: null,
        showResult: false,
        selectedOption: null,
        scoreClass: '',
        scoreDesc: ''
      })
      
      wx.pageScrollTo({ scrollTop: 0 })
    }
  },

  // 继续下一道AI题目
  nextAIQuestion() {
    const { aiQuestionList, aiCurrentIndex } = this.data
    const nextIndex = aiCurrentIndex + 1
    
    if (nextIndex < aiQuestionList.length) {
      this.setData({
        question: aiQuestionList[nextIndex],
        questionId: aiQuestionList[nextIndex]._id,
        aiCurrentIndex: nextIndex,
        selectedKey: null,
        showResult: false,
        selectedOption: null,
        scoreClass: '',
        scoreDesc: ''
      })
      
      wx.pageScrollTo({ scrollTop: 0 })
    } else {
      // 3道AI题都做完了
      wx.showModal({
        title: '太棒了！',
        content: '你已经完成了AI生成的3道新题目！还要继续挑战更多吗？',
        confirmText: '继续扩展',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            this.expandWithAI()
          } else {
            this.goBack()
          }
        }
      })
    }
  },

  // 修改 nextQuestion 方法，支持AI题目模式
  async nextQuestion() {
    const { aiQuestionList, aiCurrentIndex, module, scene, questionId, usedQuestionIds } = this.data
    
    // 如果是AI题目模式，调用 nextAIQuestion
    if (aiQuestionList && aiQuestionList.length > 0) {
      this.nextAIQuestion()
      return
    }
    
    // 原有的随机题目逻辑
    const db = wx.cloud.database()
    
    try {
      const countResult = await db.collection('questions')
        .where({ module, scene })
        .count()
      
      this.setData({ totalQuestions: countResult.total })
      
      const allQuestions = await db.collection('questions')
        .where({ module, scene })
        .get()
      
      const availableQuestions = allQuestions.data.filter(q => !usedQuestionIds.includes(q._id))
      
      if (availableQuestions.length === 0) {
        this.setData({ isAllDone: true })
        return
      }
      
      const randomIndex = Math.floor(Math.random() * availableQuestions.length)
      const nextQ = availableQuestions[randomIndex]
      const shuffledQuestion = this.shuffleOptions(nextQ)
      
      this.setData({
        question: shuffledQuestion,
        questionId: nextQ._id,
        selectedKey: null,
        showResult: false,
        selectedOption: null,
        scoreClass: '',
        scoreDesc: '',
        usedQuestionIds: [...usedQuestionIds, nextQ._id],
        doneCount: usedQuestionIds.length + 1
      })
      
      wx.pageScrollTo({ scrollTop: 0 })
    } catch (err) {
      console.error('加载下一题失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
