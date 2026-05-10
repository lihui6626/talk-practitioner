// 云函数入口文件
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 调起支付统一下单
exports.main = async (event, context) => {
  const { totalFee = 1 } = event // 金额，单位分，默认0.01元

  try {
    // 获取用户openid
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!openid) {
      return { success: false, message: '获取用户信息失败' }
    }

    // 调用微信支付统一下单API
    const result = await unifiedOrder({
      appid: process.env.APPID,        // 小程序AppID
      mchid: process.env.MCHID,         // 商户号
      description: 'AI题库赞助',
      amount: { total: totalFee, currency: 'CNY' },
      payer: { openid: openid },
      notifyUrl: process.env.NOTIFY_URL // 支付回调地址
    })

    if (result.prepay_id) {
      // 返回支付参数给小程序
      const paySign = sign(result.pretrade_no)
      return {
        success: true,
        prepayId: result.prepay_id,
        nonceStr: result.nonce_str,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        sign: paySign
      }
    } else {
      return { success: false, message: result.message || '创建订单失败' }
    }
  } catch (err) {
    console.error(err)
    return { success: false, message: err.message }
  }
}

// 统一下单
async function unifiedOrder(params) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    
    const body = {
      appid: params.appid,
      mchid: params.mchid,
      description: params.description,
      out_trade_no: `AI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time_expire: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      amount: params.amount,
      payer: params.payer,
      notify_url: params.notifyUrl
    }

    const bodyStr = JSON.stringify(body)
    
    // 使用商户API密钥签名
    const signStr = sign(bodyStr, params.mchid, params.nonce_str)
    
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: '/v3/pay/transactions/app',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `WECHATPAY2-SHA256-RSA2048 ${signStr}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// 签名（简化版，实际需要使用商户证书）
function sign(body) {
  const secret = process.env.API_SECRET || 'your_secret'
  return crypto.createHash('sha256').update(body + secret).digest('hex')
}
