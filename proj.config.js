const timeVersion = require('./bin/utils/timeVersion')
const path = require('path')
const os = require('os')

function resolve (dir) {
  return path.resolve(__dirname, dir)
}

const commonConfig = {
  /* loader升级后都默认esModule为true，会导致打包失败，所以需要配置为false */
  esModule: false,

  css: {
    extract: true,
    sourceMap: false,
    usePostCSS: true,
    CssExtractPluginPublicPath: '../../',
    useVueStyleLoader: false,
  },

  /**
   * 启用webpack5的硬盘缓存功能，可以极大提升工程的二次打包构建速度和二次冷启动速度
   * 但也并非完美无瑕，要进行某些配置重大变更或发现修改无效时，建议将该选禁用在试试
   */
  useFilesystemCache: true,

  /* Source Maps devtool 注意：webpack5下，该值填错会出现缺乏错误信息的异常，难以定位 */
  /* 可用值请参考：https://webpack.docschina.org/configuration/devtool/ */
  devtool: 'source-map',
  publicPath: './',
  assetsDir: 'static',
  outputDir: path.resolve(__dirname, './dist/publish'),
}

/* 增加自定义的extensions配置，注意保持dev和prod配置的一致性，否则会出现错误 */
const customExternals = {}

/* 增加自定义的resolve.alias配置，注意保持dev和prod配置的一致性，否则会出现错误 */
/* 以下配置为当前公有云业务的alias配置，实际，建议置空，使用默认的@规则即可 */
const customResolveAlias = {}

const projectConfig = {
  /**
   * 用户自定义配置文件的路径，默认为工程根目录下的proj.custom.config.js
   * 该选项主要解决开发人员希望在开发过程中自定义各项配置，而又不会误提交到项目中打乱他人配置、造成冲突
   * 定义的配置文件下的配置项优先级高于proj.config.js下的配置
   * 该自定义的配置文件要在.gitignore里面，否则无法达到效果，还不如直接修改proj.config.js
   */
  // customConfigFilePath: path.resolve(__dirname, './proj.custom.config.js'),

  /**
   * 开发环境配置
   */
  dev: {
    ...commonConfig,

    /**
     * 指定启动或打包哪些应用模块，支持字符串、正则，数组和函数
     * true的话自动读取src/module或src/modules或src/pages下的所有应用入口
     * 开发模式下为了提升启动和编译速度，建议指定要启动的应用模块
     */
    appEntrys: ['demo'],

    minifyHtmlTemplate: false,

    /**
     * webpack配置项，最终会通过webpack-merge合并在一起
     * 主要是为了实现更灵活的定制需求，而不需要修改脚手架本身逻辑
     * 也不建议普通开发直接修改脚手架逻辑，否则后续版本升级可能会比较麻烦
     */
    webpackConfig: {
      externals: customExternals,
      resolve: {
        alias: customResolveAlias,
      },
      /**
       * 开发服务器的完整配置选项参见：
       * https://github.com/webpack/webpack-dev-server/releases/tag/v4.0.0-beta.0
       */
      devServer: {
        /* 启用Gzip压缩 启用后编译速度会变慢 */
        compress: false,
        host: '0.0.0.0',
        port: '8088',
        open: false,
        firewall: false,
        https: true,
        dev: {
          publicPath: '/',
        },

        /**
         * 开发使用的静态服务器选项
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

        /**
         * 由于内置的代理工具规则不支持热更新，且匹配规则的匹配情况不易观测调试
         * 多环境或复杂工程建议使用Whistle、lightproxy等外部抓包代理工具替代该选项
         */
        proxy: {},
      },
    },

    /**
     * 设置要注入到HTML模板下的内容
     * 主要用于解决多页应用中统一注入公共代码的问题
     * 此处主要用于注入版本号和注入一些增强开发调试能力的逻辑
     * $template的语法跟jQuer语法相仿
     */
    setInjectContent: function ($template) {
      const timestamp = new Date().getTime()
      const injectContent = `
        <script>
          /* 统一增加开发环境运行标识，后续可以根据这个变量判断是否处于开发环境 */
          window._isDevEnv_ = true;

          /* 标识当前处于调试模式 */
          window.__debugMode__ = true;

          /* 忽略调试信息，不建议开启，给有强迫症的人使用 */
          // window.__ignoreDebugMsg__ = true;

          /* 是否自动加载eruda或vconsole，前提是加载了qwGuard.js脚本 */
          window._debugToolsConfig_ = {
            eruda: false,
            vconsole: false,
            /* 通过指定cdn地址，可以使用新版本的调试工具 */
            cdn: {
              // eruda: '//cdnjs.cloudflare.com/ajax/libs/eruda/2.2.1/eruda.js',
              // vconsole: ''
            }
          }

          /* 非window平台下自动开启调试工具 */
          if(!/win32/i.test(window.navigator.platform)){
            window._debugToolsConfig_.eruda = true
          }
        </script>
        <script src="./static/js/common/qwGuard.js?t=${timestamp}"></script>
        `

      const $title = $template('head title')
      const $dom = $title[0] ? $title : $template('head')
      $dom.after(injectContent)

      /* 增加打包时间注释，方便查看版本更新情况 */
      const Time = timeVersion.createVersionTag('buildVer')
      const packageInfo = `\n<!-- build at : ${Time} -->`
      $template('html').after(packageInfo)

      return $template
    },
  },

  /**
   * 生产环境（打包）配置
   */
  prod: {
    ...commonConfig,

    /**
     * 指定启动或打包哪些应用模块，支持字符串、正则，数组和函数
     * true的话自动读取src/module或src/modules或src/pages下的所有应用入口
     * 开发模式下为了提升启动和编译速度，建议指定要启动的应用模块
     */
    appEntrys: true,

    minifyHtmlTemplate: true,

    /**
     * webpack配置项，最终会通过webpack-merge合并在一起
     * 主要是为了实现更灵活的定制需求，而不需要修改脚手架本身逻辑
     * 也不建议普通开发直接修改脚手架逻辑，否则后续版本升级可能会比较麻烦
     */
    webpackConfig: {
      externals: customExternals,
      resolve: {
        alias: customResolveAlias,
      },
      optimization: {
        minimize: true,
      },
    },

    /**
     * 指定webpack打包完成后输出的stats信息选项
     * 更多选项参见：https://webpack.docschina.org/configuration/stats/
     */
    webpackStatsOpt: {
      errors: true,
      warnings: true,
      assets: false,
      colors: false,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
      entrypoints: false,
    },

    /**
     * 参见：
     * https://webpack.docschina.org/plugins/terser-webpack-plugin/
     * https://github.com/terser/terser#minify-options
     */
    webpackTerserOpt: {
      terserOptions: {
        compress: {
          /* 移除console消息 */
          drop_console: true,
        },
      },
    },

    /**
     * 参见：
     * https://webpack.docschina.org/plugins/css-minimizer-webpack-plugin/
     */
    webpackCssMinimizerOpt: {},

    /**
     * 设置要注入到HTML模板下的内容
     * 主要用于解决多页应用中统一注入公共代码的问题
     * 此处主要用于注入版本号和注入一些增强开发调试能力的逻辑
     * $template的语法跟jQuer语法相仿
     */
    setInjectContent: function ($template) {
      const timestamp = new Date().getTime()
      const Time = timeVersion.createVersionTag('buildVer')
      const injectContent = `
      <script>
        window._publicTime_ = "${Time}";
      </script>
      <script src="./static/js/common/qwGuard.js?t=${timestamp}"></script>
      `

      const $title = $template('head title')
      const $dom = $title[0] ? $title : $template('head')
      $dom.after(injectContent)

      /* 增加打包时间注释，方便查看版本更新情况 */
      const packageInfo = `\n<!-- build at : ${Time} -->`
      $template('html').after(packageInfo)

      return $template
    },
  },

  /**
   * gitHooks配置，只对使用git项目有效
   */
  gitHooks: {
    /**
     * eslint代码风格限定的难易程度的等级划分，语法风格错误个数超出100的禁止提交，其它根据设定的等级计算是否允许提交
     * 当前根据可允许的语法风格错误个数定义了五个等级，可选项有：
     * 等级名称：1|beginner    |初级|初来乍到 ，可允许的语法风格错误范围 21-100
     * 等级名称：2|intermediate|中级|略有小成 ，可允许的语法风格错误范围 11-20
     * 等级名称：3|merit       |优秀|渐入佳境 ，可允许的语法风格错误范围 4-10
     * 等级名称：4|distinction |卓越|炉火纯青 ，可允许的语法风格错误范围 1-3
     * 等级名称：5|master      |大师|登峰造极 ，可允许的语法风格错误范围 0-0
     * */
    level: 'master',
    /* commit前是否进行eslint代码风格检查 */
    useEslint: true,
    /* 过滤出哪些需要进行eslint检测的文件 */
    eslintFileFilter: ['**/*.js', '**/*.vue'],
    /* 允许修改哪些文件 */
    allowModifi: ['**/src/**/*.*', '**/static/**/*.*'],
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
    /* 是否允许弹窗通知 */
    allowNotify: true,
    /* 是否启用gitHooks */
    enabled: true,
  },

  /**
   * 定制开发专用的chrome浏览器，便于调试某些特殊开发任务
   * chrome浏览器启动配置参数，更多配置选项请参考：
   * https://github.com/GoogleChrome/chrome-launcher
   */
  chromeLauncher: {
    startingUrl: 'about:blank',
    /* 指定浏览器所在路径 */
    // chromePath: 'D:\\Program Files\\MyChrome\\Chrome\\chrome.exe',
    userDataDir: path.join(os.homedir(), 'unsafeBrowserOnlyForDeveloper/userData/'),
    chromeFlags: [
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--no-default-browser-check',
      '--no-first-run',
      // 禁用安全策略，可允许跨域访问任意网站内容
      '--disable-web-security',
    ],
    /* 默认chrome-launcher会内置一系列的flags */
    ignoreDefaultFlags: true,
    /* 下面标注了chrome-launcher的默认flags */
    chromeLauncherDefaultFlags: [
      '--disable-features=TranslateUI',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-sync',
      '--metrics-recording-only',
      '--disable-default-apps',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--force-fieldtrials=*BackgroundTracing/default/',
    ],
  },
}

module.exports = projectConfig
