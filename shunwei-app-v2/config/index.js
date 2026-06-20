/**
 * 双后端配置（重构方案甲）：
 * - CRMEB_GATEWAY：仅用于微信登录 / 微信支付下单 / 支付回调（沿用生产 CRMEB v5.6.4）
 * - SHUNWEI_API：所有新业务（会员 / 积分 / 积分商城 / 现金券 / 商品展示 / 抽奖）
 *
 * 开发者工具需勾选「不校验合法域名」才能直连本地 shunwei-api。
 * 生产上线时把 SHUNWEI_API 改为 ok.xjshunwei.cn 的反代路径（或独立子域）。
 *
 * 同时导出 default（含别名字段），兼容不同模块的引用习惯。
 */

const ENV = 'dev' // 'dev' | 'prod'

const CONFIG = {
    dev: {
        CRMEB_GATEWAY: 'https://ok.xjshunwei.cn',
        SHUNWEI_API: 'http://127.0.0.1:8787'
    },
    prod: {
        CRMEB_GATEWAY: 'https://ok.xjshunwei.cn',
        // TODO: 上线前改为生产 shunwei-api 地址（HTTPS 合法域名 / 反代路径）
        SHUNWEI_API: 'https://ok.xjshunwei.cn'
    }
}

export const CRMEB_GATEWAY = CONFIG[ENV].CRMEB_GATEWAY
export const SHUNWEI_API = CONFIG[ENV].SHUNWEI_API

// CRMEB 规范的 token 头名（注意：放原始 token，不加 Bearer 前缀）
export const TOKEN_HEADER = 'Authori-zation'
export const TOKEN_STORAGE_KEY = 'SW_TOKEN'
export const USERINFO_STORAGE_KEY = 'SW_USERINFO'
export const REQUEST_TIMEOUT = 30000
export const APP_ID = 'wxd3d9178b9414d20b'

export default {
    env: ENV,
    CRMEB_GATEWAY,
    SHUNWEI_API,
    // 别名（兼容）
    CRMEB_BASE_URL: CRMEB_GATEWAY,
    SHUNWEI_BASE_URL: SHUNWEI_API,
    APP_ID,
    TOKEN_HEADER,
    TOKEN_KEY: TOKEN_STORAGE_KEY,
    USER_INFO_KEY: USERINFO_STORAGE_KEY
}
