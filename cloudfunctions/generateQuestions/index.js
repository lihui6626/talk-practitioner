// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 题库集合名称
const QUESTIONS_COLLECTION = 'questions'

// 调用AI生成题目的提示词模板
function buildPrompt(existingQuestions, module, scene) {
  const sceneNames = {
    elevator: '电梯偶遇',
    pantry: '茶水间闲聊',
    canteen: '食堂搭话',
    corridor: '走廊相遇',
    meeting: '会议发言',
    lunch: '午饭邀约',
    dining: '商务餐',
    report: '向上汇报',
    review: '需求评审',
    interview: '面试追问',
    'cross-team': '跨部门协作',
    conflict: '技术争议',
    performance: '绩效面谈'
  }

  const sceneName = sceneNames[scene] || scene

  return `你是一个专业的职场沟通培训师。请为"${sceneName}"场景生成3道高质量的接话练习题。

要求：
1. 每道题包含：situation（场景情境，60字内）、options（含4个选项，ABCD各一个）
2. 选项必须有明显梯度：A最差（2分）、B一般（5分）、C良好（8分）、D最优（10分）
3. 每个选项包含：content（回答内容，30字内）、analysis（详细分析，80字内）
4. 答案要有区分度，高分答案要有真正的情商/逻辑亮点

请以JSON数组格式返回，格式如下：
[
  {
    "situation": "情境描述",
    "options": [
      {"key": "A", "content": "回答", "score": 2, "analysis": "分析"},
      {"key": "B", "content": "回答", "score": 5, "analysis": "分析"},
      {"key": "C", "content": "回答", "score": 8, "analysis": "分析"},
      {"key": "D", "content": "回答", "score": 10, "analysis": "分析"}
    ],
    "tips": "练习要点，40字内"
  }
]

注意：必须生成正好3道题，返回纯JSON，不要其他内容。`
}

// 云函数入口
exports.main = async (event, context) => {
  const { module, scene, count = 3 } = event

  try {
    // 1. 获取该场景已有的题目（用于去重提示）
    const existing = await db.collection(QUESTIONS_COLLECTION)
      .where({ module, scene })
      .limit(10)
      .get()

    // 2. 构建提示词
    const prompt = buildPrompt(existing.data, module, scene)

    // 3. 调用AI（这里使用模拟，实际需要接入AI API）
    // 注意：微信云函数不支持直接调用外部HTTP API，需要通过其他方式
    // 可以考虑：
    // - 使用云托管部署AI服务
    // - 使用云函数HTTP请求（需要配置白名单）
    // - 使用第三方AI SDK（如果支持）
    
    // 临时方案：返回一个提示，说明需要配置AI
    return {
      success: false,
      message: '云函数AI调用需要配置，请先设置AI API密钥或使用云托管部署AI服务',
      prompt: prompt,
      hint: '可选方案：1. 腾讯云API网关 + 云函数 2. 云托管部署AI服务 3. 使用微信云托管'
    }

    // 实际AI调用代码（配置好AI后启用）：
    /*
    const AI_API_URL = '你的AI接口地址'
    const AI_API_KEY = '你的API密钥'
    
    const response = await cloud.cloudCallContainer({
      containerUri: AI_API_URL,
      method: 'POST',
      header: { 'Authorization': `Bearer ${AI_API_KEY}` },
      body: { prompt }
    })
    
    const questions = JSON.parse(response.data)
    
    // 4. 保存到数据库
    const now = new Date()
    const insertPromises = questions.map(q => 
      db.collection(QUESTIONS_COLLECTION).add({
        data: {
          ...q,
          module,
          scene,
          sceneName: getSceneName(scene),
          createdAt: now,
          isAIGenerated: true
        }
      })
    )
    
    await Promise.all(insertPromises)
    
    return {
      success: true,
      count: questions.length,
      questions
    }
    */

  } catch (err) {
    console.error('生成题目失败', err)
    return {
      success: false,
      message: err.message || '生成失败'
    }
  }
}

function getSceneName(scene) {
  const names = {
    elevator: '电梯偶遇',
    pantry: '茶水间闲聊',
    canteen: '食堂搭话',
    corridor: '走廊相遇',
    meeting: '会议发言',
    lunch: '午饭邀约',
    dining: '商务餐',
    report: '向上汇报',
    review: '需求评审',
    interview: '面试追问',
    'cross-team': '跨部门协作',
    conflict: '技术争议',
    performance: '绩效面谈'
  }
  return names[scene] || scene
}