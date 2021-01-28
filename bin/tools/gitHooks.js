/*!
 * @name         lint.js
 * @description  代码风格检查，提交检查等
 * @version      0.0.1
 * @author       Blaze
 * @date         2019/1/17 11:13
 * @github       https://github.com/xxxily
 */

const fs = require('fs-extra')
const path = require('path')
const notifier = require('node-notifier')
const micromatch = require('micromatch')
const shell = require('shelljs')
const rootPath = require('../utils/rootPath')
const utils = require('../utils/utils')
const simpleLevel = require('./simpleLevel')
const JsonFile = require('../utils/jsonFile')
const comment = require('../data/comment')
const simpleGit = require('simple-git/promise')
const pkg = require(path.resolve(rootPath, './package.json'))

const config = require('../proj.config')
const gitHooksConf = {
  /**
   * eslint代码风格限定的难易程度的等级划分，语法风格错误个数超出100的禁止提交，其它根据设定的等级计算是否允许提交
   * 当前根据可允许的语法风格错误个数定义了五个等级，可选项有：
   * 等级名称：1|beginner    |初级|初来乍到 ，可允许的语法风格错误范围 21-100
   * 等级名称：2|intermediate|中级|略有小成 ，可允许的语法风格错误范围 11-20
   * 等级名称：3|merit       |优秀|渐入佳境 ，可允许的语法风格错误范围 4-10
   * 等级名称：4|distinction |卓越|炉火纯青 ，可允许的语法风格错误范围 1-3
   * 等级名称：5|master      |大师|登峰造极 ，可允许的语法风格错误范围 0-0
   * */
  level: 'beginner',
  /* commit前是否进行eslint代码风格检查 */
  useEslint: true,
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
    '**/src/**/*.(png|gif)': 100,
    '**/src/**/*.(jpg|jpeg)': 300,
    '**/src/**/*.svg': 100,
  },
  /* 文件行数限制 */
  lineLimit: {
    '**/src/**/*.js': 1200,
    '**/src/**/*.vue': 1200,
  },
  /* 进行push操作前需先合并哪些分支 */
  mergeBeforePush: ['master'],
  /* 执行完mergeBeforePush操作后，是否允许自动安装依赖包，前提是安装了yarn */
  autoInstallPackageAfterMerge: true,
  /* 指定package.json的目录，默认为rootPath，对于多包工程，需指定package.json的目录 */
  packagePaths: [rootPath],
  /* 允许执行Merge操作时调用相关 hooks 目前Merge判断基于commit msg */
  enabledMergeHooks: false,
  /* 是否允许弹窗通知 */
  allowNotify: true,
  /* gitHooks的日志输出目录 */
  logPath: path.resolve(rootPath, './log'),
  /* gitPath默认为当前工程得根目录，对于多包工程需要指定路径，否则不兼容 */
  gitPath: rootPath,
  /* 是否启用gitHooks */
  enabled: true,
}
if (config.gitHooks) {
  Object.assign(gitHooksConf, config.gitHooks)
}

const git = simpleGit(gitHooksConf.gitPath)
const CLIEngine = require('eslint').CLIEngine
const cli = new CLIEngine(gitHooksConf.eslintOption || {})

const gitHooks = {
  logFile: new JsonFile(path.resolve(gitHooksConf.logPath, 'gitHooks.log.json')),
  /**
   * 获取被修改过的的文件列表，当前方案只支持per-commit hooks
   * 由于当前项目结构下，使用lint-staged 匹配到的文件有问题，
   * 例如。使用 "**" 并不能匹配到 qwy或wap下面修改的文件，所以选择了自己实现文件修改检测
   * 非多包项目，建议直接使用lint-staged，比较完善
   * @returns {Promise<any>}
   */
  // eslint-disable-next-line no-async-promise-executor
  getChangeFiles: () =>
    new Promise(async (resolve) => {
      let changeFiles = []

      /**
       * 注意：per-commit再进行diff的时候，内容会进入暂存区
       * 这个时候如果不加 --cached 将会检测不到任何变化，请参考：
       * https://stackoverflow.com/questions/45721633/git-diff-does-not-work-when-run-from-a-git-pre-commit-hook
       * 当前文件差异只支持per-commit hooks，其它hooks的差异对比需通过diff tree实现
       */
      const diffSummaryStr = await git.diff(['--cached', '--numstat']).catch(function () {
        resolve(changeFiles)
      })

      /* 将diffSummary字符串转换成只有文件路径的数组信息 */
      const diffArr = diffSummaryStr.split('\n')
      const filePathArr = []
      diffArr.forEach(function (strLine) {
        const filePath = strLine.split('\t')[2]
        if (filePath) {
          filePathArr.push(path.resolve(gitHooksConf.gitPath, filePath))
        }
      })
      changeFiles = filePathArr

      /**
       * 如果上面方案不成功，则使用 status 进行获取
       * 注意，diff 方案才能实现各种hook的的差异对比，而status只对per-commit 起作用
       */
      if (!diffSummaryStr) {
        const status = await git.status().catch(function () {
          resolve(changeFiles)
        })
        if (status) {
          changeFiles = [].concat(status.created, status.modified, status.renamed)
          changeFiles = changeFiles.map((filePath) => path.resolve(gitHooksConf.gitPath, filePath))
        }
      }

      resolve(changeFiles)
    }),

  /**
   * utils.cmds 的简单分支，指定了运行路径
   * @param cmds
   */
  gitCmds: function (cmds) {
    utils.cmds(cmds, {
      cwd: gitHooksConf.gitPath,
    })
  },

  /* 消息通知 */
  notify: function (msg, title) {
    if (!gitHooksConf.allowNotify) {
      console.error(msg)
      return false
    }

    title = (title || '请按规范提交代码') + `(${pkg.name})`

    const opt = {
      title: title,
      message: msg || '请输入提示内容',
      sound: true,
      wait: false,
    }
    notifier.notify(opt)
  },

  /**
   * 获取日志输出目录，如果目录不存在会先创建一个
   * @returns {string}
   */
  getLogDir: function () {
    const logPath = gitHooksConf.logPath
    fs.ensureDirSync(logPath)
    return logPath
  },

  /**
   * 取出某个范围的随机数
   * @param min
   * @param max
   * @returns {number}
   */
  random: function (min, max) {
    const count = max - min + 1
    return Math.floor(Math.random() * count + min)
  },

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
   * eslint 等级检测，分级主要是为了过渡引导用，减少执行过程中生产的抵抗情绪和对业务开发的影响
   * @param report {object} -必选 eslint的检查结果
   */
  eslintLevelCheck: function (report) {
    const t = this
    // const score = report.errorCount / report.lintFileList.length
    const score = report.errorCount
    const curLevel = simpleLevel.getLevelByScore(score)
    let isPass = curLevel > 0
    let commentStr = simpleLevel.getCommentByLevelNumber(curLevel)

    /* 级别控制 */
    const levelRule = simpleLevel.getLevelByAlias(gitHooksConf.level)
    if (curLevel < levelRule) {
      isPass = false
    }

    /* 完全不合规范的代码的提示语 */
    if (score > 100) {
      const badComments = comment.bad
      commentStr = badComments[t.random(0, badComments.length - 1)]
    }

    t.notify(`检测到 ${report.errorCount} 处语法错误！${commentStr}`, 'Eslint:')

    return isPass
  },

  /**
   * 检查是不允许修改的文件
   * @param fileList {array} -必选 文件列表
   */
  eslintCheck: function (fileList) {
    const t = this
    let isPass = true

    if (gitHooksConf.useEslint) {
      const report = t.eslint(fileList)

      /* 移除source字段，减少文件体积和输出流的噪音 */
      report.results.forEach(function (item) {
        delete item.source
      })

      /* 存储检测结果 */
      try {
        fs.writeJsonSync(path.resolve(t.getLogDir(), 'eslint.log.json'), report, {
          spaces: '\t',
        })
      } catch (err) {
        console.error(err)
      }

      if (report.errorCount > 0) {
        console.error('eslint 检测结果如下：')
        console.error(JSON.stringify(report, null, '\t'))
        t.logFile.writeToNodeSync('eslintFileList', report.lintFileList)
      }

      isPass = t.eslintLevelCheck(report)
    }

    return isPass
  },

  /**
   * 检查是不允许修改的文件
   * @param fileList {array} -必选 文件列表
   */
  notAllowModifiCheck: function (fileList) {
    const t = this
    const rejectModifiFileList = micromatch(fileList, gitHooksConf.rejectModifi)
    let notAllowModifiFileList = micromatch.not(fileList, gitHooksConf.allowModifi)
    let isPass = true

    notAllowModifiFileList = notAllowModifiFileList.concat(rejectModifiFileList)

    if (notAllowModifiFileList.length) {
      isPass = false
      const fileListStr = notAllowModifiFileList.join('\n')

      console.error('以下文件已被配置为不允许随意修改：')
      console.error(fileListStr)
      t.notify('检查到你修改了不该修改的文件，请还原后再执行此操作~')

      t.logFile.writeToNodeSync('notAllowModifiFileList', notAllowModifiFileList)
    }
    return isPass
  },

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
  fileSizeLimitCheck: function (fileList) {
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

    const isPass = !limitFileList.length

    if (!isPass) {
      const tips = '你提交了存在体积过大的文件，请优化后提交'
      t.notify(tips, '文件大小超限')
      console.error(tips)
      console.error(limitFileList)
      t.logFile.writeToNodeSync('sizeLimitFileList', limitFileList)
    }

    return isPass
  },

  /**
   * 文件行数限制检测
   * @param fileList
   */
  fileLineLimitCheck: function (fileList) {
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

    const isPass = !limitFileList.length

    if (!isPass) {
      const tips = '部分文件内容的行数超限，请优化后提交'
      t.notify(tips, '文件行数超限')
      console.error(tips)
      console.error(limitFileList)
      t.logFile.writeToNodeSync('lineLimitFileList', limitFileList)
    }

    return isPass
  },

  /* 验证不通过的时候，拒绝执行下一步的git操作 */
  rejectGitHandle: function () {
    const t = this
    console.error('验证不通过，不允许进行当前的git操作~')
    t.logFile.writeToNodeSync('logTime', new Date().toString())

    /* 保留一段时间，用于消息提示 */
    const time = gitHooksConf.allowNotify ? 1000 * 5 : 1000 * 0.2
    setTimeout(function () {
      process.exit(1)
    }, time)
  },

  /**
   * 执行合并分支操作，合并前会执行pull操作
   * @param branchNameList {array} -必选 提供一个或一组分支名称
   */
  mergeBranch: function (branchNameList) {
    const t = this
    if (branchNameList && branchNameList.length) {
      const mergeCmds = branchNameList.map((branchName) => 'git merge origin/' + branchName)
      t.gitCmds(mergeCmds)
    }
  },

  /**
   * 自动安装依赖，前提是已经安装了yarn
   * @returns {boolean}
   */
  installPackage: function () {
    const t = this

    if (!shell.which('yarn')) {
      console.error('你没安装yarn，无法为你自动安装依赖~')
      return false
    }
    const tipsMsg = '正在为你安装依赖，如果是初次操作，需要较长时间，请稍后~'
    console.log(tipsMsg)
    t.notify(tipsMsg, '来自gitHooks的通知：')

    const packagePaths = Array.isArray(gitHooksConf.packagePaths)
      ? gitHooksConf.packagePaths
      : [gitHooksConf.packagePaths]

    for (let i = 0; i < packagePaths.length; i++) {
      const packagePath = packagePaths[i]
      utils.cmds(['yarn'], { cwd: packagePath, })
    }
  },

  /**
   * 获取最后更新的CommitHash
   * @returns {Promise<any>}
   */
  getLatestCommitHash: () =>
    new Promise(function (resolve, reject) {
      git
        .log(['-1'])
        .then(function (LogSummary) {
          resolve(LogSummary.latest.hash)
        })
        .catch(reject)
    }),

  /**
   * 获取当前提交的commit msg
   * 返回为false表示没获取到，返回空字符串表示没有相关commit信息
   * @returns {*}
   */
  getCommitMsg: function () {
    if (!process.env.HUSKY_GIT_PARAMS) {
      return false
    }

    const msgFile = process.env.HUSKY_GIT_PARAMS.split(' ')[0]
    try {
      const msgBuffer = fs.readFileSync(path.resolve(gitHooksConf.gitPath, msgFile))
      return msgBuffer.toString()
    } catch (e) {
      console.error('getCommitMsg error:', e)
      return false
    }
  },

  /**
   * 判断当前的操作是否为merge 操作，当前主要通过提交的commit msg 进行判断
   * @returns { boolean }
   */
  isMergeAction: function () {
    const t = this
    const commitMsg = t.getCommitMsg()
    const isMerge = commitMsg && commitMsg.match(/^Merge[\s\S]{1,18}branch/)
    return isMerge
  },

  /**
   * commit-msg hooks，目前支持：
   * 1、修改权限检查
   * 2、文件行数检查
   * 3、文件大小检查
   * 4、eslint检查
   * @param changeFiles
   * @returns {Promise<*>}
   */
  commitMsgAction: async function (changeFiles) {
    const t = this

    const disableMergeHooks = !gitHooksConf.enabledMergeHooks
    if (disableMergeHooks && t.isMergeAction()) {
      console.log('跳过merge操作的相关 hooks')
      console.log('commit msg:', t.getCommitMsg())
      return true
    }

    /* 清空旧日志信息 */
    t.logFile.writeSync({})

    // 由于弹窗提示的限制，不宜一次多条检测结果，所以只能逐项检测，逐项提示，而不能一次全部检测，提示所有，
    // 后面修改提示逻辑后可考虑全部检测完再一次性提示

    const isNotAllowModifiCheckPass = t.notAllowModifiCheck(changeFiles)
    if (!isNotAllowModifiCheckPass) {
      t.rejectGitHandle()
      return false
    }

    const isFileLineLimitCheckPass = t.fileLineLimitCheck(changeFiles)
    if (!isFileLineLimitCheckPass) {
      t.rejectGitHandle()
      return false
    }

    const isFileSizeLimitCheckPass = t.fileSizeLimitCheck(changeFiles)
    if (!isFileSizeLimitCheckPass) {
      t.rejectGitHandle()
      return false
    }

    const isEslintCheckPass = t.eslintCheck(changeFiles)
    if (!isEslintCheckPass) {
      t.rejectGitHandle()
      return false
    }
  },

  /**
   * per-push hooks，目前支持：
   * 1、自动拉取最新代码
   * 2、合并master等自定义分支
   * 3、如果有更新到内容自动安装依赖
   * @param changeFiles
   * @returns {Promise<*>}
   */
  prePushAction: async function (changeFiles) {
    const t = this

    const oldCommitHash = await t.getLatestCommitHash().catch(function (err) {
      console.error('getLatestCommitHash', err)
    })

    t.gitCmds('git pull')
    t.mergeBranch(gitHooksConf.mergeBeforePush)

    const newCommitHash = await t.getLatestCommitHash().catch(function (err) {
      console.error('getLatestCommitHash', err)
    })

    if (gitHooksConf.autoInstallPackageAfterMerge && oldCommitHash !== newCommitHash) {
      t.installPackage()
    }
  },

  init: async function () {
    const t = this

    if (!gitHooksConf.enabled) {
      console.error('git hooks 操作已被禁止~')
      return true
    }

    const changeFiles = await t.getChangeFiles()
    const isPerPushHooks = utils.hasNpmArgv('pre-push')
    const isCommitMsgHooks = utils.hasNpmArgv('commit-msg')

    if (isPerPushHooks) {
      t.prePushAction(changeFiles)
    }
    if (isCommitMsgHooks) {
      t.commitMsgAction(changeFiles)
    } else {
      console.log('no match any hooks')
    }
  },
}

gitHooks.init()
