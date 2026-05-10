// 云函数入口文件
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const QUESTIONS_COLLECTION = 'questions'

// 调用AI API
async function callAI(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }

    const body = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 800
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('AI响应解析失败'))
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

function buildPrompt(existing, module, scene, count) {
  const sceneNames = {
    elevator: '电梯偶遇', pantry: '茶水间闲聊', canteen: '食堂搭话',
    corridor: '走廊相遇', meeting: '会议发言', lunch: '午饭邀约',
    dining: '商务餐', report: '向上汇报', review: '需求评审',
    interview: '面试追问', 'cross-team': '跨部门协作',
    conflict: '技术争议', performance: '绩效面谈'
  }
  const moduleName = module === 'daily' ? '日常接话' : '职场逻辑'
  const sceneName = sceneNames[scene] || scene

  let examples = ''
  if (existing && existing.length > 0) {
    examples = '\n\n参考已有题目风格：\n' +
      existing.slice(0, 2).map((q, i) => `${i + 1}. ${q.situation}`).join('\n')
  }

  return `你是职场沟通培训师。为"${sceneName}"场景生成${count}道${moduleName}练习题。

【重要要求】
1. situation必须是"对话式"：描述两个人之间的对话场景，例如"同事说：'...' 你应该怎么回应？"或"领导问：'...' 你怎么回答？"
2. 不要生成"你应该怎么做"的陈述式题目，必须是"对方说了什么，你怎么回应"的对话式
3. 4个选项ABCD，A=2分(差)、B=5分(一般)、C=8分(好)、D=10分(优秀)
4. content（30字内）、analysis（80字内）
5. 情境真实有代表性，不要和已有重复${examples}
6. 使用标准中文标点，禁止使用特殊符号或乱码字符

返回JSON数组格式：
[
  {"situation":"同事在电梯里遇到你，笑着说：'最近看你气色不错啊，是不是谈恋爱了？' 你会怎么回应？","options":[{"key":"A","content":"...","score":2,"analysis":"..."},...],"tips":"..."}
]

必须正好${count}道题，返回纯JSON，不要markdown格式。`
}

exports.main = async (event, context) => {
  const { module, scene, count = 1 } = event

  try {
    // 获取已有题目
    const { data: existing } = await db.collection(QUESTIONS_COLLECTION)
      .where({ module, scene })
      .limit(5).get()

    // 获取API密钥
    const apiKey = process.env.API_KEY
    if (!apiKey) {
      return { success: false, message: '请先配置API_KEY环境变量' }
    }

    // 调用AI
    const response = await callAI(buildPrompt(existing, module, scene, count), apiKey)

    if (response.error) {
      throw new Error(response.error.message)
    }

    const content = response.choices[0].message.content
    const questions = JSON.parse(content.match(/\[[\s\S]*\]/)[0])

    if (!Array.isArray(questions) || questions.length !== count) {
      throw new Error(`AI返回题目数量不正确，期望${count}道`)
    }

    // 保存到数据库（批量插入优化）
    const now = new Date()
    const sceneNames = {
      elevator: '电梯偶遇', pantry: '茶水间闲聊', canteen: '食堂搭话',
      corridor: '走廊相遇', meeting: '会议发言', lunch: '午饭邀约',
      dining: '商务餐', report: '向上汇报', review: '需求评审',
      interview: '面试追问', 'cross-team': '跨部门协作',
      conflict: '技术争议', performance: '绩效面谈'
    }

    // 批量准备数据
    const batch = questions.map(q => ({
      id: `${module}_${scene}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...q,
      module,
      scene,
      sceneName: sceneNames[scene] || scene,
      createdAt: now,
      isAIGenerated: true
    }))

    // 批量写入（微信云数据库不支持真正的batch insert，用Promise.all优化）
    await Promise.all(batch.map(item => 
      db.collection(QUESTIONS_COLLECTION).add({ data: item })
    ))

    return {
      success: true,
      count: count,
      questions: questions.map(q => ({ situation: q.situation }))
    }

  } catch (err) {
    console.error(err)
    return { success: false, message: err.message || '生成失败' }
  }
}
