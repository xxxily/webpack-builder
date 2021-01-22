/*!
 * @name         entrys.js
 * @description  自动获取应用入口脚本的辅助脚本
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/17 10:48
 * @github       https://github.com/xxxily
 */

const path = require('path')
const glob = require('glob')
const fs = require('fs-extra')
const projRootPath = require('../../utils/rootPath')
const utils = require('../../utils/utils')

function isObj(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}
function isReg(reg) {
  return Object.prototype.toString.call(reg) === '[object RegExp]'
}

/* 获得批量入口配置 */
const entrys = {
  /**
   * 通过过滤规则提取对应的 entrys 结果
   * @param entryResult {Object} -必选 原始entrys结果
   * @param filter {String|RegExp|Function|Array} -必选 过滤规则，支持字符串、正则、函数
   * @returns {{}|*|{}}
   */
  getEntrysByFilter(entryResult, filter) {
    if (!isObj(entryResult) || !filter || filter === true) {
      return entryResult || {}
    }

    /* 字符串规则或正则规则转为数组规则 */
    if (typeof filter === 'string' || isReg(filter) || filter instanceof Function) {
      filter = [filter]
    }

    const filterResult = {}

    /* 处理数组规则 */
    if (Array.isArray(filter)) {
      Object.keys(entryResult).forEach((key) => {
        for (let i = 0; i < filter.length; i++) {
          const ruleItem = filter[i]

          /* 数组过滤器里面允许包含字符串全等匹配规则和正则匹配规则 */
          if (typeof ruleItem === 'string' && ruleItem === key) {
            filterResult[key] = entryResult[key]
          } else if (isReg(ruleItem) && ruleItem.test(key)) {
            filterResult[key] = entryResult[key]
          } else if (ruleItem instanceof Function) {
            if (ruleItem(key, entryResult[key]) === true) {
              filterResult[key] = entryResult[key]
            }
          }
        }
      })
    } else {
      console.error('提供给getEntrysByFilter的filter参数有误，无法进行过滤处理')
    }

    return filterResult
  },

  /**
   * 获取应用入口信息
   * @param filter {String|RegExp|Array|Function} -选填 指定使用某些入口，默认是自动获取所有入口
   * 通过指定入口可实现按需启动，组合打包等功能
   * @param basePath {string} -选填 指定要在哪个路径下查找入口文件
   * @param rootPath {string} -选填 指定glob运行的根目录和查找入口文件基础路径的根目录
   * @returns {*} 返回入口地址列表
   */
  getEntrys(filter, basePath, rootPath) {
    rootPath = rootPath || projRootPath

    /* 默认支持的入口文件目录路径 */
    const defaultBasePathArr = ['./src/module/', './src/modules/', './src/pages/']

    const entryResult = {}
    const matchResult = []

    /* 查找是否存在默认的应用存放目录，如果有则使用默认的目录 */
    if (!basePath) {
      for (let i = 0; i < defaultBasePathArr.length; i++) {
        const defaultBasePath = defaultBasePathArr[i]
        if (fs.existsSync(path.join(rootPath, defaultBasePath))) {
          basePath = defaultBasePath
          break
        }
      }
    }

    if (!basePath || !fs.existsSync(path.join(rootPath, basePath))) {
      console.error('未找到存放应用的目录，无法为您自动查找入口路径，请检查您的配置是否正确：')
      console.error(`[basePath] ${basePath}`)
      console.error(`[rootPath] ${rootPath}`)
      return entryResult
    }

    /* 提取匹配的路径 */
    const globPath = basePath + '*/*.{ts,js}'
    const globResult = glob.sync(globPath, {
      cwd: rootPath,
    })

    globResult.forEach(function (val) {
      const fileName = path.basename(val, path.extname(val))
      /* 为了尽可能兼容不规则入口，此处需作特殊处理 */
      if (path.dirname(val).toLowerCase().includes(fileName.toLowerCase())) {
        matchResult.push(val)
      }
    })

    let basename
    matchResult.forEach(function (entry) {
      basename = path.basename(entry, path.extname(entry))
      entryResult[basename] = entry
    })

    if (JSON.stringify(entryResult) === '{}') {
      console.error('未找到任何入口路径，请检查当前配置目录下是否正确添加了应用：')
      console.error(`[basePath] ${basePath}`)
      console.error(`[rootPath] ${rootPath}`)
    }

    if (filter) {
      const filterResult = entrys.getEntrysByFilter(entryResult, filter)

      if (JSON.stringify(filterResult) === '{}' && JSON.stringify(entryResult) !== '{}') {
        console.error('未找过滤出任何入口结果，请检查您的过滤规则是否正确：')
        console.error(`[basePath] ${basePath}`)
        console.error(`[rootPath] ${rootPath}`)
        console.error(`[filter] ${filter}`)
      }

      return filterResult
    }

    return entryResult
  },

  /**
   * 自动判断当前需要使用的入口，主要该函数有较大的副作用
   * 会受到proj.config、npm命令参数等地方的影响
   * eg. npm run dev -e index docs 表示开发时只运行index、docs两个应用
   * 当npm命令参数指定entry参数时其优先级高于配置选项的entry
   */
  smartEntrys(filter, basePath, rootPath) {
    const allOpt = ['all', 'allEntry', 'allentry', 'allEntrys', 'allentrys']
    const entryOpt = ['e', 'entry', 'entrys']
    const allConf = utils.getNpmArgItemByFilter(allOpt)
    const entryConf = utils.getNpmArgItemByFilter(entryOpt)

    if (allConf) {
      filter = true
    } else {
      filter = entryConf || filter
    }

    return entrys.getEntrys(filter, basePath, rootPath)
  },
}

module.exports = entrys
