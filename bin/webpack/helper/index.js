const path = require('path')
const rootPath = require('../../utils/rootPath')
const config = require('../../proj.config')
const pkg = require(path.resolve(rootPath, './package.json'))
const notifier = require('node-notifier')

/**
 * 判断是否为开发环境
 * @returns {boolean}
 */
function isDev() {
  return process.env.NODE_ENV === 'development'
}

/**
 * 判断是否为production环境
 * @returns {boolean}
 */
function isProd() {
  return process.env.NODE_ENV === 'production'
}

/**
 * 判断是否为测试环境
 * @returns {boolean}
 */
function isTest() {
  return process.env.NODE_ENV === 'test'
}

const helper = {
  isDev,
  isProd,
  isTest,

  /**
   * 组装资源要存放的实际目录
   * @param _path
   * @returns {string}
   */
  assetsDir(_path) {
    const assetsDir = isProd() ? config.prod.assetsDir : config.dev.assetsDir
    return path.posix.join(assetsDir, _path)
  },

  /**
   * 相对根目录进行路径解析
   * @param _path
   * @returns {*|Promise<void>|Promise<any>}
   */
  resolve(_path) {
    return path.resolve(rootPath, _path)
  },

  notify(msg, title, subtitle) {
    notifier.notify({
      title: title || pkg.name,
      message: msg || 'no message',
      subtitle: subtitle || '',
      icon: path.resolve(rootPath, 'logo.png'),
    })
  },

  /**
   * 获取外部干预打包入口选项的过滤码
   */
  getFilterCode() {
    const t = helper

    if (t._filterCode_) {
      return t._filterCode_
    }

    let filterCode = process.argv.find((val) => /--filter-/.test(val))
    if (filterCode) {
      filterCode = filterCode.replace('--filter-', '')
      t._filterCode_ = filterCode
    }

    return filterCode
  },

  createNotifierCallback: () => {
    return (severity, errors) => {
      if (severity !== 'error') return

      const error = errors[0]
      const filename = error.file && error.file.split('!').pop()
      const msg = severity + ': ' + error.name
      helper.notify(msg, false, filename)
    }
  },
}

module.exports = helper
