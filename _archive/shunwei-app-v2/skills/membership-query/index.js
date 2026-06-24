const queryMyMembership = require('./apis/queryMyMembership')
const queryMyIntegral = require('./apis/queryMyIntegral')
const queryMembershipPlans = require('./apis/queryMembershipPlans')
const queryMyCashVoucher = require('./apis/queryMyCashVoucher')
const { getToken } = require('./tools/request')

const SKILL_PATH = 'skills/membership-query'

const skill = wx.modelContext.createSkill(SKILL_PATH)

skill.use(async (ctx, next) => {
  const needAuth = ['queryMyMembership', 'queryMyIntegral', 'queryMyCashVoucher']
  if (needAuth.includes(ctx.name) && !getToken()) {
    throw new Error('NOT_LOGGED_IN')
  }
  await next()
})

skill.registerAPI('queryMyMembership', queryMyMembership)
skill.registerAPI('queryMyIntegral', queryMyIntegral)
skill.registerAPI('queryMembershipPlans', queryMembershipPlans)
skill.registerAPI('queryMyCashVoucher', queryMyCashVoucher)
