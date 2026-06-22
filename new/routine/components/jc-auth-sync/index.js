const { syncAuthFromApp } = require('../../services/jc-request')

Component({
  lifetimes: {
    attached: function () { syncAuthFromApp() },
    ready: function () { syncAuthFromApp() }
  },
  pageLifetimes: {
    show: function () { syncAuthFromApp() }
  }
})
