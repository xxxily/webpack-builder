/**
 * 公共方法模块，与外层的utils.js不同，此模块尽可能减少无关依赖，更加公共，更加独立
 */
const childProcess = require('child_process')
module.exports = {
  /**
   * 打开某个指定的url
   * @param url {string} -必选 完整的url地址
   */
  openUrl(url) {
    let cmd = 'start'
    const platform = process.platform

    switch (platform) {
      case 'wind32':
        cmd = 'start'
        break
      case 'linux':
        cmd = 'xdg-open'
        break
      case 'darwin':
        cmd = 'open'
        break
    }
    childProcess.exec(`${cmd} ${url}`)
  },

  /* 获取运行npm命令时候的参数 */
  getNpmConfigArgv() {
    let argv = []
    if (process.env.npm_config_argv) {
      const npmArgv = JSON.parse(process.env.npm_config_argv)
      argv = npmArgv.original || []
    }
    return argv
  },

  /* 解析npm run 命令的参数 */
  parseNpmRunOrder() {
    const t = this
    const npmArgv = t.getNpmConfigArgv()
    const resule = {
      order: undefined,
      args: {},
    }

    function parseArgs(args) {
      let lastArgName = null
      args.forEach((item) => {
        if (/^(-|\/)/.test(item)) {
          const argName = item.replace(/^(-|\/)+/, '')
          resule.args[argName] = []
          lastArgName = argName
        } else if (lastArgName) {
          resule.args[lastArgName].push(item)
        }
      })
    }

    if (npmArgv.length >= 2 && npmArgv[0] === 'run') {
      resule.order = npmArgv[1]
      if (npmArgv.length > 2) {
        parseArgs(npmArgv.slice(2))
      }
    }

    return resule
  },

  /**
   * 通过指定过滤规则，获取npn参数对应的选项
   * 例如想同时支持entrys，entry，e选项，即：
   * npm run xx -entrys , npm run xx -entry , npm run xx -e
   * 这些都视为同一个选项，那么只需要指定filter为：['entrys','entry','e']即可获取到它们对应的选项内容
   * @param filter {String|Array} -必选，指定过滤规则
   * @returns {null|Array}
   */
  getNpmArgItemByFilter(filter) {
    const npmOrder = this.parseNpmRunOrder()

    if (typeof filter === 'string') {
      filter = [filter]
    }

    if (!Array.isArray(filter)) {
      return null
    }

    const argsKeys = Object.keys(npmOrder.args)
    let result = null

    for (let i = 0; i < argsKeys.length; i++) {
      const key = argsKeys[i]
      if (filter.includes(key)) {
        result = npmOrder.args[key]
        break
      }
    }

    return result
  },

  /**
   * 判断当前是否传了某个npm命令参数
   * @param argv {string} -必选 要判断的参数，可以不加前缀 - 或 -- ，会自动判断是否存在带 - 或 -- 的参数，例如传 fix，则会自动判断是否存在 -fix 或 --fix
   */
  hasNpmArgv(argv) {
    const t = this
    const argvStr = argv.replace(/^-+/g, '')
    const npmArgv = t.getNpmConfigArgv()
    return npmArgv.includes('-' + argvStr) || npmArgv.includes('--' + argvStr)
  },
  /**
   * 同步运行连续的cli命令，例如 cmds(['git add','git commit -m "test"'])
   * @param commands {string|array} -必选 可以是单个命令，也可以是多个命令
   * @param options {object} -可选 child_process.exec 所有可用参数
   */
  cmds(commands, options) {
    const commandList = typeof commands === 'string' ? [commands] : commands
    commandList.forEach(function (cmd) {
      childProcess.execSync(cmd, options)
    })
  },

  /**
   * 根据文本路径获取对象里面的值
   * @param obj {Object} -必选 要操作的对象
   * @param path {String} -必选 路径信息
   * @returns {*}
   */
  getValByPath(obj, path) {
    path = path || ''
    const pathArr = path.split('.')
    let result = obj

    if (path) {
      /* 递归提取结果值 */
      for (let i = 0; i < pathArr.length; i++) {
        if (!result) break
        result = result[pathArr[i]]
      }
    }

    return result
  },
}
