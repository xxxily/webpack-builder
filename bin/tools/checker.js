const fs = require('fs-extra')
const micromatch = require('micromatch')
const ProcessAssist = require('process-assist')

const config = require('../proj.config')
const gitHooksConf = {
  /* eslint选项 请参考：https://cn.eslint.org/docs/developer-guide/nodejs-api#cliengine */
  eslintOption: {},
  /* 过滤出哪些需要进行eslint检测的文件 */
  eslintFileFilter: ['**/*.js'],
  /* 允许修改哪些文件，默认全部 */
  allowModifi: ['**'],
  /* 拒绝修改某些文件，结合allowModifi，提供更灵活的配置 reject优先于allow */
  rejectModifi: [],
  /* 文件大小限制，单位Kb */
  sizeLimit: {
    '**/(src|static)/**/*.(png|gif)': 100,
    '**/(src|static)/**/*.(jpg|jpeg)': 300,
    '**/src/**/*.svg': 100,
  },
  /* 文件行数限制 */
  lineLimit: {
    '**/src/**/*.js': 1200,
    '**/src/**/*.vue': 1200,
  },
}
if (config.gitHooks) {
  Object.assign(gitHooksConf, config.gitHooks)
}

const CLIEngine = require('eslint').CLIEngine
const cli = new CLIEngine(gitHooksConf.eslintOption || {})

const checker = {
  /**
   * 进行eslint校验
   * @param files {array} -必选 要检验的文件列表
   */
  eslint: function (files) {
    const eslintFiles = micromatch(files, gitHooksConf.eslintFileFilter)
    const report = cli.executeOnFiles(eslintFiles)
    report.lintFileList = eslintFiles
    return report
  },

  /**
   * 检查是不允许修改的文件
   * @param fileList {array} -必选 文件列表
   */
  notAllowModifiList: function (fileList) {
    const rejectModifiFileList = micromatch(fileList, gitHooksConf.rejectModifi)
    let notAllowModifiFileList = micromatch.not(fileList, gitHooksConf.allowModifi)

    notAllowModifiFileList = notAllowModifiFileList.concat(rejectModifiFileList)

    return notAllowModifiFileList
  },

  /**
   * 根据配置规则提取出符合规则的文件列表
   * @param fileList {Array} -必选 原始文件列表
   * @param ObjectRule {Object} -必选 配置规则对象
   * @param filterMethod {Function} -必选 规则匹配成功后的过滤方法
   * @returns {[]} 返回提取到的文件列表
   */
  filterFileListByObjectRule: function (fileList, ObjectRule, filterMethod) {
    const result = []
    if (!fileList || fileList.length === 0 || !ObjectRule || !filterMethod) {
      return result
    }

    const matchRule = Object.keys(ObjectRule)
    const needFilterFileList = micromatch(fileList, matchRule)
    if (!needFilterFileList.length) {
      return result
    }

    matchRule.forEach(function (rule) {
      const condition = ObjectRule[rule]
      const fileList = micromatch(needFilterFileList, rule)
      fileList.forEach(function (filePath) {
        try {
          const isMatchCondition = filterMethod(filePath, condition)
          if (isMatchCondition) {
            result.push(filePath)
          }
        } catch (err) {
          console.error('filterMethod error:', err)
        }
      })
    })
    return result
  },

  /**
   * 文件大小限制检测
   * @param fileList
   */
  fileSizeLimitList: function (fileList) {
    const t = this
    const limitFileList = t.filterFileListByObjectRule(
      fileList,
      gitHooksConf.sizeLimit,
      function (filePath, condition) {
        if (!fs.existsSync(filePath)) {
          return false
        }
        const stats = fs.statSync(filePath)
        return stats.size / 1024 > condition
      }
    )
    return limitFileList
  },

  /**
   * 文件行数限制检测
   * @param fileList
   */
  fileLineLimitList: function (fileList) {
    const t = this
    const limitFileList = t.filterFileListByObjectRule(
      fileList,
      gitHooksConf.lineLimit,
      function (filePath, condition) {
        if (!fs.existsSync(filePath)) {
          return false
        }
        const content = fs.readFileSync(filePath).toString()
        const matchResult = content.match(/\n/g)
        return matchResult && matchResult.length > condition
      }
    )

    return limitFileList
  },
}

// 共享checker下面的函数给父程序调用
// eslint-disable-next-line no-new
new ProcessAssist(checker)

module.exports = checker
