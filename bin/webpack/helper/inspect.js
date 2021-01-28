/*!
 * @name         inspect.js
 * @description  审查webpack相关配置，用于解决多重合并后，查看最终规则的问题
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/21 14:09
 * @github       https://github.com/xxxily
 */
const utils = require('../../utils/utils')
const { program, } = require('commander')
const npmConfig = utils.getNpmConfigArgv()

program.option('-evn, --environment [env]', '指定环境变量，可选值有：dev、prod', 'prod')
program.option('-mode [mode]', '跟-evn的作用和用法一致', 'prod')
program.option('-p, --path [path]', '指定要获取配置的键值路径，eg. -p webpack.module.rules')
program.option('-h, --help', '使用帮助')
program.option(
  '-helpme, --help-me',
  '使用帮助（使用npm命令进行传参时，-h无法生效，建议使用-helpme）'
)

if (npmConfig.length > 2) {
  program.parse(npmConfig)
} else {
  program.parse(process.argv)
}

const programOpts = program.opts()

/* 显示帮助信息 */
if (programOpts.help || programOpts.helpMe) {
  program.help()
}

/* 指定环境变量，加载对应的配置 */
if (programOpts.environment || programOpts.Mode) {
  const environment = programOpts.environment || programOpts.Mode
  switch (environment) {
    case 'p':
    case 'prod':
    case 'production':
      process.env.NODE_ENV = 'production'
      break
    case 'd':
    case 'dev':
    case 'development':
      process.env.NODE_ENV = 'development'
      break
    case 't':
    case 'test':
      process.env.NODE_ENV = 'test'
      break
    default:
      break
  }
}

const projConfig = require('../../proj.config')
const entrys = require('./entrys')
const helper = require('./index')

async function inspect () {
  let webpackConfig = {}
  if (helper.isDev()) {
    webpackConfig = await require('../config/dev')
  } else {
    webpackConfig = require('../config/prod')
  }

  console.log('当前NODE_ENV环境信息：', process.env.NODE_ENV)
  console.log('\n')

  const npmOrder = npmConfig.length > 1 ? npmConfig[1] : null
  const tipsStr = npmOrder ? `npm run ${npmOrder}` : ''

  if (programOpts.path) {
    const pathOptKey = programOpts.path
    const pathArr = pathOptKey.split('.')
    const objKey = pathArr.shift()
    const pathStr = pathArr.join('.')

    if (objKey.startsWith('webpack')) {
      console.log(utils.getValByPath(webpackConfig, pathStr))
    } else if (objKey.startsWith('proj')) {
      console.log(utils.getValByPath(projConfig, pathStr))
    } else if (objKey.startsWith('entry')) {
      /* 获取entry代码 */
      const entryObj = entrys.smartEntrys()
      console.log(Object.keys(entryObj).join(' '))

      console.log('\n')
      console.log('如需获取webpack的entry配置，请使用如下命令：')
      console.log(`${tipsStr} -p webpack.entry`)
      console.log(`${tipsStr} -p webpack.entry -evn dev`)
    } else {
      console.error('您输入的路径无法匹配任何配置选项')
    }
  } else {
    console.log(webpackConfig)

    console.log('\n')
    console.log('通过使用-p选项和-evn选项可以获取指定的配置选项，例如：')
    console.log(`${tipsStr} -p webpack -evn dev`)
    console.log(`${tipsStr} -p webpack.module.rules -evn dev`)
    console.log(`${tipsStr} -p proj`)
    console.log(`${tipsStr} -p proj.dev`)
    console.log(`${tipsStr} -p entry`)
  }
}

inspect()
