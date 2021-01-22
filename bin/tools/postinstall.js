const fs = require('fs-extra')
const path = require('path')
const rootPath = require('../utils/rootPath')

const defaultConfigPath = path.resolve(rootPath, './proj.config.js')
const customConfigPath = path.resolve(rootPath, './proj.custom.config.js')

/* 自动创建自定义配置文件 */
if (!fs.existsSync(customConfigPath) && fs.existsSync(defaultConfigPath)) {
  fs.copy(defaultConfigPath, customConfigPath)
}
