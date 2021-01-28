/**
 * 项目配置的预处理文件，输出最终的配置结果
 */

const fs = require('fs-extra')
const path = require('path')

/**
 * 加载配置文件，会先判断是否存在对应的配置文件在去加载，文件不存在将返回空对象
 * @param filePath
 * @returns {{}}
 */
function loadConf (filePath) {
  let result = {}

  if (fs.existsSync(filePath)) {
    result = require(filePath)
  }
  return result
}

const projDefaultConf = loadConf(path.resolve(__dirname, '../proj.config.js'))
let projCustomConf = loadConf(path.resolve(__dirname, '../proj.custom.config.js'))
if (projDefaultConf.customConfigFilePath) {
  projCustomConf = loadConf(projDefaultConf.customConfigFilePath)
}

// 使用webpack-merge会导致函数运行两次，setInjectContent选项最终运行结果将和预期不一致，所以此处不适合用来作为配置项的合并
// const { mergeWithCustomize } = require('webpack-merge')
// const customMerge = mergeWithCustomize({
//   customizeArray (a, b, key) {
//     /* 数组合并去重，而不是直接合并 */
//     // return Array.from(new Set(a.concat(b)))
//
//     /* 由于要保证自定义配置优先级高于默认配置，此处的数组要直接替换为B的值 */
//     return b
//   }
// })

const deepMerge = require('./utils/deepMerge')
const projConf = deepMerge.merge(projDefaultConf, projCustomConf)

module.exports = projConf
