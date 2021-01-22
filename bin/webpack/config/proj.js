/*!
 * @name         proj.js
 * @description  获取工程定义的跟webpack有相关的配置
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/17 11:08
 * @github       https://github.com/xxxily
 */

const helper = require('../helper')
const config = require('../../proj.config')

/* 默认为dev环境的配置 */
let projConf = config.dev
if (helper.isProd()) {
  projConf = config.prod
} else if (helper.isTest()) {
  projConf = config.test
}

module.exports = projConf
