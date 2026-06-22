const fs = require('fs')
const s = fs.readFileSync('F:/newshunweiapp/shunweiapp/new/routine/common/vendor.js', 'utf8')
const idx = s.indexOf('9fd2:function')
console.log(s.slice(idx, idx + 3500))
