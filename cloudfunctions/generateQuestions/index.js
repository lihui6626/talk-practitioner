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
      max_tokens: 2000
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

function buildPrompt(existing, module, scene) {
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
    examples = '\n\n已有题目（生成不同情境）：\n' +
      existing.slice(0, 2).map((q, i) => `${i + 1}. ${q.situation}`).join('\n')
  }

  return `你是职场沟通培训师。为"${sceneName}"场景生成3道${moduleName}练习题。

要求：
1. situation（60字内）、4个选项ABCD
2. A=2分(差)、B=5分(一般)、C=8分(好)、D=10分(优秀)
3. content（30字内）、analysis（80字内）
4. 情境真实有代表性，不要和已有重复${examples}

返回JSON数组：
[
  {"situation":"...","options":[{"key":"A","content":"...","score":2,"analysis":"..."},...],"tips":"..."}
]

必须正好3道题，返回纯JSON。`
}

exports.main = async (event, context) => {
  const { module, scene } = event

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
    const response = await callAI(buildPrompt(existing, module, scene), apiKey)

    if (response.error) {
      throw new Error(response.error.message)
    }

    const content = response.choices[0].message.content
    const questions = JSON.parse(content.match(/\[[\s\S]*\]/)[0])

    if (!Array.isArray(questions) || questions.length !== 3) {
      throw new Error('AI返回格式错误')
    }

    // 保存到数据库
    const now = new Date()
    const sceneNames = {
      elevator: '电梯偶遇', pantry: '茶水间闲聊', canteen: '食堂搭话',
      corridor: '走廊相遇', meeting: '会议发言', lunch: '午饭邀约',
      dining: '商务餐', report: '向上汇报', review: '需求评审',
      interview: '面试追问', 'cross-team': '跨部门协作',
      conflict: '技术争议', performance: '绩效面谈'
    }

    for (const q of questions) {
      await db.collection(QUESTIONS_COLLECTION).add({
        data: {
          id: `${module}_${scene}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          ...q,
          module,
          scene,
          sceneName: sceneNames[scene] || scene,
          createdAt: now,
          isAIGenerated: true
        }
      })
    }

    return {
      success: true,
      count: 3,
      questions: questions.map(q => ({ situation: q.situation }))
    }

  } catch (err) {
    console.error(err)
    return { success: false, message: err.message || '生成失败' }
  }
}
