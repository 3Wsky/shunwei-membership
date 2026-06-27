const { BASE_URL } = require('./jc-request')

/** 从 OCR/AI 返回的纯文本中提取 SN / IMEI */
function parseSnImeiFromText(text) {
  const raw = String(text || '').replace(/\s+/g, ' ')
  let sn = ''
  let imei = ''

  const imeiLabel = raw.match(/IMEI[^0-9A-Za-z]{0,6}(\d{15})/i)
  const imeiBare = raw.match(/\b(\d{15})\b/)
  if (imeiLabel) imei = imeiLabel[1]
  else if (imeiBare) imei = imeiBare[1]

  const snPatterns = [
    /S\/N[^0-9A-Za-z]{0,6}([A-Z0-9]{8,20})/i,
    /\bSN[^0-9A-Za-z]{0,4}([A-Z0-9]{8,20})/i,
    /序列号[^0-9A-Za-z]{0,6}([A-Z0-9]{8,20})/i,
    /Serial[^0-9A-Za-z]{0,6}([A-Z0-9]{8,20})/i
  ]
  for (var i = 0; i < snPatterns.length; i++) {
    var m = raw.match(snPatterns[i])
    if (m && m[1]) {
      sn = m[1].toUpperCase()
      break
    }
  }

  if (!sn) {
    var candidates = raw.match(/\b([A-Z0-9]{10,12})\b/g) || []
    for (var j = 0; j < candidates.length; j++) {
      var c = candidates[j]
      if (c !== imei && !/^\d+$/.test(c)) {
        sn = c
        break
      }
    }
  }

  return { sn: sn, imei: imei, brand: '', model: '' }
}

function wxOcrPrintedText(filePath) {
  return new Promise(function (resolve, reject) {
    if (!wx.ocr || typeof wx.ocr.printedText !== 'function') {
      return reject(new Error('当前微信版本不支持本地 OCR'))
    }
    wx.ocr.printedText({
      filePath: filePath,
      success: function (res) {
        var text = ''
        if (res.text) {
          text = res.text
        } else if (Array.isArray(res.items)) {
          text = res.items.map(function (item) {
            return item.text || item.words || ''
          }).join('\n')
        }
        resolve(parseSnImeiFromText(text))
      },
      fail: reject
    })
  })
}

function uploadForAiVision(filePath, token) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: BASE_URL + '/api/staff/scan-sn',
      filePath: filePath,
      name: 'file',
      header: {
        'Authori-zation': 'Bearer ' + token,
        'Form-type': 'routine'
      },
      success: function (res) {
        try {
          var body = JSON.parse(res.data)
          if (body.status === 200 && body.data) {
            resolve({ ok: true, data: body.data })
          } else {
            resolve({
              ok: false,
              msg: body.msg || '识别失败',
              status: body.status
            })
          }
        } catch (e) {
          reject(e)
        }
      },
      fail: reject
    })
  })
}

function isVisionUnconfigured(result) {
  if (!result || result.ok) return false
  if (result.status === 503) return true
  return /未配置|vision|视觉/i.test(String(result.msg || ''))
}

/**
 * 优先走后端 AI 视觉；若服务未配置则降级为微信本地 OCR
 */
function recogniseSn(filePath, token) {
  if (!token) {
    return Promise.reject(new Error('请先登录'))
  }
  return uploadForAiVision(filePath, token).then(function (server) {
    if (server.ok) {
      return Object.assign({}, server.data, { source: 'ai' })
    }
    if (isVisionUnconfigured(server)) {
      return wxOcrPrintedText(filePath).then(function (local) {
        return Object.assign({}, local, { source: 'ocr' })
      }).catch(function () {
        throw new Error('AI 视觉未配置，请手动输入 SN 或联系管理员配置 IMAGE_GEN_API_KEY')
      })
    }
    throw new Error(server.msg || '识别失败')
  })
}

module.exports = {
  recogniseSn: recogniseSn,
  parseSnImeiFromText: parseSnImeiFromText
}
