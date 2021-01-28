const CssExtractPlugin = require('mini-css-extract-plugin')

/**
 * css Loaders规则生成器
 * @param options {Object} -必选，定义生成规则
 * @param options.esModule -可选，是否使用esModule，默认true，
 * 如果是旧项目升级，建议设置false，否则很可能导致报错
 * @param options.sourceMap -可选，默认false
 * @param options.usePostCSS -可选，默认true
 * @param options.useVueStyleLoader -可选，默认false，使用了PostCSS，就不要开启该选项，不要混用
 * @param options.extract -可选，默认true，提取样式到单独文件，建议开启
 * @param options.CssExtractPluginPublicPath -可选，默认'../../'，
 * 这是建立在将css提取到static/css目录下得到的，如果目录层级有变，则该规则需要修改，建议使用默认选项
 */
function cssLoadersGenerator (options) {
  options = options || {}
  const esModule = options.esModule || true
  const sourceMap = options.sourceMap || false
  const extract = options.extract || true
  const usePostCSS = options.usePostCSS || true

  const cssLoader = {
    loader: 'css-loader',
    options: {
      esModule,
      sourceMap,
      /**
       * 有多少个Loader在css-loader前面
       * 如果不设置这个，在使用了postcss-loader后会导致src路径解析出错：src=[object Module]
       * https://www.webpackjs.com/loaders/css-loader/#importloaders
       */
      importLoaders: 2,
    },
  }

  const postcssLoader = {
    loader: 'postcss-loader',
    options: { sourceMap, },
  }

  function generateLoaders (loader, loaderOptions) {
    const loaders = usePostCSS ? [cssLoader, postcssLoader] : [cssLoader]

    if (loader) {
      loaders.push({
        loader: loader + '-loader',
        options: Object.assign({}, loaderOptions, {
          sourceMap,
        }),
      })
    }

    if (extract) {
      loaders.unshift({
        loader: CssExtractPlugin.loader,
        options: {
          esModule,
          /**
           *  由于将css提取到了单独的css目录下
           *  会导致css内的资源路径发生变更，多了一层css目录
           *  所以需要重新定义publicPath
           **/
          publicPath: options.CssExtractPluginPublicPath || '../../',
        },
      })
    }

    if (options.useVueStyleLoader) {
      loaders.unshift('vue-style-loader')
    }

    return loaders
  }

  const loaderMap = {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    stylus: generateLoaders('stylus'),
    styl: generateLoaders('stylus'),
    sass: generateLoaders('sass', { indentedSyntax: true, }),
    scss: generateLoaders('sass'),
  }

  const loaderRule = []
  for (const extension in loaderMap) {
    const loader = loaderMap[extension]
    loaderRule.push({
      test: new RegExp('\\.' + extension + '$'),
      use: loader,
    })
  }

  return loaderRule
}

module.exports = cssLoadersGenerator
