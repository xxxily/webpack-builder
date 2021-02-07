const path = require('path')
const projConf = require('./proj')
const helper = require('../helper')
const rootPath = require('../../utils/rootPath')
const webpack = require('webpack')
const CssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const cssLoadersGenerator = require('./css')
const htmlTemplateFactory = require('../helper/htmlTemplateFactory')
const utils = require('../../utils/utils')
const { VueLoaderPlugin, } = require('vue-loader')
const entrysMod = require('../helper/entrys')

async function configHandler () {
  let useEntrysInquirer = projConf.entrysInquirer
  if (typeof projConf.entrysInquirer === 'number' && projConf.entrysInquirer > 0) {
    /**
     * 如果entrysInquirer指定的是数字，则表示当应用总数超过一定数量的时候才进行询问
     * 这样可以减少频繁询问用户的次数，少给用户造成的困扰
     */

    const allEntry = entrysMod.getEntrys()
    if (Object.keys(allEntry).length >= projConf.entrysInquirer) {
      useEntrysInquirer = true
    } else {
      useEntrysInquirer = false
    }
  }

  const entrys = await entrysMod.smartEntrys({
    filter: projConf.appEntrys || false,
    inquirer: useEntrysInquirer,
    remember: true,
  })

  /* 预防对象缺失导致报错 */
  if (!projConf.css) {
    projConf.css = {}
  }

  /* webpack基本配置 */
  const webpackConfig = {
    context: rootPath,
    devtool: projConf.devtool,
    entry: entrys,
    output: {
      path: projConf.outputDir,
      filename: helper.assetsDir('[name].js'),
      publicPath: projConf.publicPath,
    },
    externals: {},
    /* 解析模块请求的选项 */
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json'],
      alias: {
        '@': path.resolve(rootPath, 'src'),
        '@api': path.resolve(rootPath, 'src/api'),
        '@assets': path.resolve(rootPath, 'src/assets'),
      },
    },
    module: {
      /* 模块规则（配置 loader、解析器等选项） */
      rules: [
        ...cssLoadersGenerator({
          esModule: projConf.esModule,
          sourceMap: projConf.css.sourceMap,
          usePostCSS: projConf.css.usePostCSS,
          useVueStyleLoader: projConf.css.useVueStyleLoader,
          extract: projConf.css.extract,
          CssExtractPluginPublicPath: projConf.css.CssExtractPluginPublicPath,
        }),
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.m?jsx?$/,
          exclude: (file) => {
            /* 始终转换非js文件类型 */
            if (!/\.js$/.test(file)) {
              return false
            }

            /* 排除node_modules */
            return /node_modules/.test(file)
          },
          include: [path.resolve(rootPath, 'src')],
          use: [
            'thread-loader',
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
              },
            },
          ],
        },

        {
          test: /\.tsx?$/,
          use: [
            'thread-loader',
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
              },
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                appendTsSuffixTo: ['\\.vue$'],
                happyPackMode: true,
              },
            },
          ],
        },

        {
          test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            esModule: projConf.esModule,
            limit: 10000,
            name: helper.assetsDir('img/[name].[hash:7].[ext]'),
          },
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            esModule: projConf.esModule,
            limit: 10000,
            name: helper.assetsDir('media/[name].[hash:7].[ext]'),
          },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            esModule: projConf.esModule,
            limit: 10000,
            name: helper.assetsDir('fonts/[name].[hash:7].[ext]'),
          },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: `"${process.env.NODE_ENV}"`,

          // vue3 feature flags <http://link.vuejs.org/feature-flags>
          __VUE_OPTIONS_API__: 'true',
          __VUE_PROD_DEVTOOLS__: 'false',
        },
      }),
      new VueLoaderPlugin(),
      new CssExtractPlugin({
        filename: helper.assetsDir('css/[name].[contenthash].css'),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(rootPath, projConf.assetsDir),
            to: projConf.assetsDir,
            globOptions: {
              ignore: ['.*'],
            },
          },
        ],
      }),

      /* 创建html模板插件配置选项 */
      ...htmlTemplateFactory.createHtmlWebpackPlugins(entrys),
    ],
  }

  const noCacheOpt = ['nc', 'nocache', 'noCache']
  const noCacheArg = utils.getNpmArgItemByFilter(noCacheOpt)

  /**
   * 使用硬盘缓存
   * 但如果命令行提供了禁止缓存选项，则useFilesystemCache选项会被忽略
   */
  if (projConf.useFilesystemCache && !noCacheArg) {
    webpackConfig.cache = {
      type: 'filesystem',
      cacheDirectory: path.resolve(rootPath, './node_modules/.cache/webpack_builder_temp_cache'),
    }
  }

  return webpackConfig
}

module.exports = configHandler
