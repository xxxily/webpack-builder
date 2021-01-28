/*!
 * @name         buildCore.js
 * @description  打包核心处理逻辑
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/18 10:38
 * @github       https://github.com/xxxily
 */

const ora = require('ora')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const fs = require('fs-extra')
const dayjs = require('dayjs')
const rootPath = require('../../utils/rootPath')
const JsonFile = require('../../utils/jsonFile')
const timeVersion = require('../../utils/timeVersion')
const helper = require('./index')
const pkg = require(path.resolve(rootPath, './package.json'))

/* 打包日志记录，用于信息统计等需求 */
const log = require('../../utils/log')
const msgLog = log.create({
  fileNamePrefix: `${pkg.name}_log_`,
  path: path.resolve(rootPath, './log'),
})

const buildCore = {
  /**
   * 创建应用的打包状态信息文件，结合qwGuard.js可实现自动清缓存功能
   * @param filePath
   */
  createAppStatusFile (filePath) {
    filePath = path.resolve(filePath)

    const appStatus = new JsonFile(filePath, { spaces: 2, })
    appStatus.writeSync({
      /* 获取打包时候的版本信息 */
      lastVersion: timeVersion.getLastVersion('buildVer'),
      /* 自动清除html缓存，需结合qwGuard.js才能生效 */
      isClearHtmlCache: true,
    })
  },

  /**
   * 打包成功后的后续处理程序，执行某些补丁处理
   * @param webpackConfig {Object} -必选 打包的webpack配置信息
   * @param stats {Object} -必选 打包后的stats信息
   */
  afterBuildHandle: function (webpackConfig, stats) {
    return new Promise(function (resolve, reject) {
      const OUTPUTPATH = stats.compilation.outputOptions.path
      const appStatusJsonPath = path.resolve(OUTPUTPATH, helper.assetsDir('/data/appStatus.json'))
      const appStatusHtmlPath = path.resolve(OUTPUTPATH, helper.assetsDir('/data/appStatus.html'))

      buildCore.createAppStatusFile(appStatusJsonPath)

      /* 创建多一份.html文件是因为发现即使请求加了时间戳，cdn还是会缓存.json，而不会缓存.html */
      buildCore.createAppStatusFile(appStatusHtmlPath)

      resolve(true)
    })
  },

  /**
   * 工程构建函数
   * @param webpackConfig {Object} -必选 进行打包的webpack配置
   * @param outputDir {path|Boolean} -可选，指定发布目录，用于动态修改webpackConfig.output.path配置
   * 如果传入的是true，则相当使用临时目录，结果将输出到dist/.tempDir目录下
   * @param statsOpt {Boolean} -可选 指定webpack输出的stats信息
   * 参见：https://webpack.docschina.org/configuration/stats/
   * @param silent {Boolean} -可选，默认false，是否静进行默打包，不输出webpack的stats信息
   * @returns {Promise<any>}
   */
  build: function (webpackConfig, outputDir, statsOpt, silent) {
    return new Promise((resolve, reject) => {
      if (outputDir) {
        if (typeof outputDir === 'string') {
          /* 指定发布目录 */
          webpackConfig.output.path = outputDir
        } else {
          /* 发布到dist/.tempDir下的临时创建的目录下 */
          outputDir = path.resolve(rootPath, './dist/.tempDir/' + new Date().getTime())
          webpackConfig.output.path = outputDir
        }
      }

      const startTime = Date.now()
      const filterCode = helper.getFilterCode()

      msgLog.hideLog('Filter code: ' + filterCode || 'undefined')
      msgLog.hideLog('Build start time: ' + dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'))

      if (filterCode) {
        console.log(chalk.cyan('  Build by filter code: ' + filterCode + '.'))
      } else {
        console.log(chalk.cyan('  Build by project config.'))
      }

      const spinner = ora('building for production...')
      spinner.start()

      /* 清空原来的打包数据然后进行打包 */
      fs.emptyDir(webpackConfig.output.path)
        .then(() => {
          webpack(webpackConfig, async (err, stats) => {
            spinner.stop()
            if (err || stats.hasErrors()) {
              return reject(stats || err)
            }

            if (!silent) {
              console.log(chalk.cyan('  Build complete.'))
              console.log(
                chalk.yellow(
                  '  Tip: built files are meant to be served over an HTTP server.\n' +
                    "  Opening index.html over file:// won't work.\n"
                )
              )
            }

            msgLog.hideLog('Build end time: ' + dayjs().format('YYYY-MM-DD HH:mm:ss'))
            msgLog.hideLog('Build duration: ' + (Date.now() - startTime) + 'ms')

            /* 调整相关选项过滤日志输出 */
            const defaultStatsOpt = {
              errors: true,
              warnings: true,
              assets: false,
              colors: true,
              modules: false,
              children: false,
              chunks: false,
              chunkModules: false,
              entrypoints: true,
            }

            statsOpt = Object.assign(defaultStatsOpt, statsOpt || {})
            process.stdout.write(stats.toString(statsOpt) + '\n')

            if (stats.hasErrors()) {
              console.log(chalk.red('  Build failed with errors.\n'))
              process.exit(1)
            }

            await buildCore.afterBuildHandle(webpackConfig, stats, filterCode).catch(reject)
            msgLog.hideLog('Output dir: ' + webpackConfig.output.path)
            msgLog.hideLog('----------------------------------------')

            return resolve({ stats, webpackConfig, })
          })
        })
        .catch((err) => {
          reject(err)

          if (!silent) {
            throw err
          }
        })
    })
  },
}

module.exports = buildCore
