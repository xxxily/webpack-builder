/* 指定NODE_ENV信息，用于加载正确的配置信息 */
process.env.NODE_ENV = 'production'

const buildCore = require('./helper/buildCore')
const prodWebpackConfig = require('./config/prod')
const projConf = require('./config/proj')
const utils = require('../utils/utils')

const tmpDirOpt = ['tmp', 'tmpdir', 'tmpDir']
const useTmpDir = Boolean(utils.getNpmArgItemByFilter(tmpDirOpt))

async function init () {
  await buildCore
    .build(prodWebpackConfig, useTmpDir, projConf.webpackStatsOpt)
    .catch((err) => {
      if (err.toString) {
        console.error(err.toString())
      } else {
        console.error(err)
      }
    })
    .then(({ stats, webpackConfig, }) => {
      console.log('Assets output directory : ' + webpackConfig.output.path + '\n')
    })
}

init()
