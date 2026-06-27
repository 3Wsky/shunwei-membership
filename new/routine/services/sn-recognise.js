const { BASE_URL } = require('./jc-request')

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

function recogniseSn(filePath, token) {
  if (!token) {
    return Promise.reject(new Error('请先登录'))
  }
  return uploadForAiVision(filePath, token).then(function (server) {
    if (server.ok) {
      return server.data
    }
    throw new Error(server.msg || '识别失败')
  })
}

module.exports = {
  recogniseSn: recogniseSn
}
