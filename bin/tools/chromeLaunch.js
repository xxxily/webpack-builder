/*!
 * @name         chrome.launch.js
 * @description  chrome启动脚本，用于启动自定义的chrome浏览器，方便开发
 * @version      0.0.1
 * @author       Blaze
 * @date         2020/7/30 9:46
 * @github       https://github.com/xxxily
 */

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const chromeLauncher = require('chrome-launcher')
const config = require('../proj.config')
const JsonFile = require('../utils/jsonFile')
const rootPath = require('../utils/rootPath')
const appLog = new JsonFile(path.resolve(rootPath, './log/chromeLauncherLog.json'))

/**
 * 可选配置选项参考文档：
 * https://github.com/GoogleChrome/chrome-launcher
 */
const launchConfig = config.chromeLauncher || {
  startingUrl: '',
  // 指定浏览器所在路径
  chromePath: '',
  userDataDir: path.join(os.homedir(), 'unsafeBrowserOnlyForDeveloper/userData/'),
  logLevel: 'info',
  output: 'json',
  // 指定启动chrome的标识，可以开启或禁用chrome的各种特性
  // https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md
  // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
  chromeFlags: [
    // '--disable-setuid-sandbox',
    // '--disable-gpu',
    // 禁用安全策略，可允许跨域访问任意网站内容
    '--disable-web-security',
  ],
}
if (launchConfig.userDataDir) {
  fs.ensureDirSync(launchConfig.userDataDir)
}

async function start() {
  const runLog = await appLog.read()

  /* window下无法正常终结子程序，重新运行程序的时候，尝试把上次运行的进程终结掉，方便调试 */
  if (runLog.lastInfo && runLog.lastInfo.pid) {
    try {
      process.kill(runLog.lastInfo.pid)
    } catch (e) {}
  }

  const chrome = await chromeLauncher.launch(launchConfig)
  launchConfig.port = chrome.port

  /* 记录下运行日志 */
  appLog.write({
    lastInfo: JSON.parse(JSON.stringify(chrome)),
  })

  console.log(`Chrome debugging port running on ${chrome.port}`)
  // console.warn('注意：当前启动的浏览器存在安全风险，仅用于开发调试，切勿作为个人常规浏览器使用')
  console.warn(
    'Warn: The currently launched browser has security risks and is only used for development and debugging, and should not be used as a personal regular browser'
  )
}

start()
