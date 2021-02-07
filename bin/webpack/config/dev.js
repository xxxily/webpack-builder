/* 输出堆栈信息，方便定位问题 */
process.traceDeprecation = true
/* 指定NODE_ENV，用于加载正确的配置信息 */
process.env.NODE_ENV = 'development'

const helper = require('../helper')
const projConf = require('./proj')
const htmlTemplateFactory = require('../helper/htmlTemplateFactory')
const { merge, } = require('webpack-merge')
const path = require('path')
const baseWebpackConfig = require('./base')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const portfinder = require('portfinder')

const devDefaultConfig = {
  mode: 'development',
  /**
   * 开发服务器的完整配置选项参见：
   * https://github.com/webpack/webpack-dev-server/releases/tag/v4.0.0-beta.0
   */
  devServer: {
    compress: false,
    host: '0.0.0.0',
    port: '8088',
    open: false,
    firewall: false,
    https: false,
    dev: {
      publicPath: '/',
    },

    /**
     * 静态服务器选项
     * 在webpack-dev-server@4.0.0-beta.0下，该选项默认开启
     * 并且默认把程序运行的根目录作为静态资源目录，导致启动时需处理大量静态资源
     * 会造成启动缓慢、CPU高负荷运行，占用大量内存等问题
     * 如无静态服务需求，建议将该选项禁用 -> static: false
     * 更多说明参见：
     * https://github.com/webpack/webpack-dev-server/releases/tag/v4.0.0-beta.0
     */
    static: {
      directory: path.resolve(__dirname, '../dev-static'),
      staticOptions: {
        /* 参见：http://expressjs.com/en/4x/api.html#express.static */
      },
      publicPath: '/dev-static/',
      serveIndex: false,
      watch: false,
    },

    liveReload: false,
    // onBeforeSetupMiddleware: config.dev.before || function (app) {},
    // onAfterSetupMiddleware: config.dev.after || function (app) {},
    /* 代理设置 */
    proxy: {},
  },
  plugins: [],
}

module.exports = async function () {
  /* 跟基础配置信息进行合并，组合出开发环境的配置信息 */
  const devWebpackConfig = merge(await baseWebpackConfig(), devDefaultConfig, projConf.webpackConfig)

  return new Promise((resolve, reject) => {
    portfinder.basePort = process.env.PORT || devWebpackConfig.devServer.port
    portfinder.getPort((err, port) => {
      if (err) {
        reject(err)
      } else {
        process.env.PORT = port
        devWebpackConfig.devServer.port = port

        const devServer = devWebpackConfig.devServer
        const protocol = devServer.https ? 'https' : 'http'

        let host = devServer.host
        if (host === '0.0.0.0') {
          host = 'localhost'
        }

        const successMessages = [`Your application is running here: ${protocol}://${host}:${port}`]
        const devPublicPath = devServer.dev.publicPath

        /* 增加可用的访问入口提示 */
        const templatePages = htmlTemplateFactory.getTemplatePages(devWebpackConfig.entry)
        if (templatePages) {
          successMessages.push('The page entry you might want to visit:')
          Object.values(templatePages).forEach(function (pagesPath) {
            const pagesName = path.basename(pagesPath)
            const url = `${protocol}://${host}:${port}${devPublicPath}${pagesName}`
            successMessages.push(url)
          })
        }

        devWebpackConfig.plugins.push(
          new FriendlyErrorsPlugin({
            compilationSuccessInfo: {
              messages: successMessages,
            },
            onErrors: projConf.notifyOnErrors ? helper.createNotifierCallback() : undefined,
          })
        )

        resolve(devWebpackConfig)
      }
    })
  })
}
