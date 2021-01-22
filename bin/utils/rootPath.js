/* 定义工程的根目录 */
const fs = require('fs-extra')
const path = require('path')

let rootPath = process.cwd()
if (!fs.existsSync(path.resolve(rootPath, './package.json'))) {
  rootPath = path.resolve(__dirname, '../../')
}

module.exports = rootPath
