/* 输出堆栈信息，方便定位问题 */
process.traceDeprecation = true
/* 指定NODE_ENV信息，用于加载正确的配置信息 */
process.env.NODE_ENV = 'production'

const projConf = require('./proj')
const helper = require('../helper')
const deepMerge = require('../../utils/deepMerge')
const { merge } = require('webpack-merge')
const baseWebpackConfig = require('./base')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const terserDefaultOpt = {
  /* 开启多线程压缩 os.cpus().length - 1 */
  parallel: true,
  /* 剥离注释 */
  extractComments: true,
  /* 配置选项：https://github.com/terser/terser#minify-options */
  terserOptions: {
    /* 解析选项 */
    parse: {},
    /* 压缩选项 */
    compress: {
      /* 移除console消息 */
      drop_console: true,
    },
    mangle: {},
    /* 格式选项 */
    format: {},
  },
}

const cssMinimizerDefaultOpt = {}

const prodDefaultConfig = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(deepMerge.merge(terserDefaultOpt, projConf.webpackTerserOpt || {})),
      new CssMinimizerPlugin(
        deepMerge.merge(cssMinimizerDefaultOpt, projConf.webpackCssMinimizerOpt || {})
      ),
    ],
  },
  output: {
    path: projConf.outputDir,
    filename: helper.assetsDir('js/[name][chunkhash].js'),
    chunkFilename: helper.assetsDir('js/[name][chunkhash].js'),
  },
  plugins: [],
}

const prodWebpackConfig = merge(baseWebpackConfig, prodDefaultConfig, projConf.webpackConfig)

module.exports = prodWebpackConfig
