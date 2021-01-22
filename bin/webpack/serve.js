/**
 * 以脚本的形式运行webpack-dev-server
 * 提供更灵活的运行方案，并且可以做到一次运行整个工程，而不需要分应用运行
 */

/* 指定NODE_ENV信息，用于加载正确的配置信息 */
process.env.NODE_ENV = 'development'

const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const devConf = require('./config/dev')

async function start() {
  const devWebpackConfig = await devConf
  const devServerOptions = devWebpackConfig.devServer
  const host = devServerOptions.host || '0.0.0.0'
  const port = devServerOptions.port || 8088

  const compiler = webpack(devWebpackConfig)
  const server = new WebpackDevServer(compiler, devServerOptions)

  compiler.hooks.done.tap('serve', (stats) => {
    if (stats.hasErrors()) {
      return false
    }
  })

  server.listen(port, host, (err) => {
    if (err) {
      process.exit(0)
    }
  })
}

start()
