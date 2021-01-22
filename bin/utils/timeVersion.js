/*!
 * @name         timeVersion.js
 * @description  版本号管理工具，用于确保多个应用的整个构建过程拥有唯一的一个构建时间，而不是实时变化的时间
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/17 11:31
 * @github       https://github.com/xxxily
 */

const path = require('path')
const dayjs = require('dayjs')
const JsonFile = require('./jsonFile')
const rootPath = require('./rootPath')
const versionLogPath = path.resolve(rootPath, './log/version.log.json')
const versionLog = new JsonFile(versionLogPath, { spaces: 2 })

const timeVersion = {
  getVersionHistory() {
    let versionHistory = versionLog.readNodeSync('versions') || []

    /* 如果数据结构被误修改了，则自动修正 */
    if (!Array.isArray(versionHistory)) {
      versionHistory = []
    }

    return versionHistory
  },
  /* 获取最后一次版本记录 */
  getLastVersion(id) {
    const versionHistory = this.getVersionHistory()
    let lastVersion = versionHistory.pop()
    if (id) {
      lastVersion = this._versionTagCache_[id] || lastVersion
    }
    return lastVersion
  },
  _versionTagCache_: {},
  /**
   * 创建一个版本标识，默认返回的是当前时间的字符模式
   * 创建成功后会添加到历史记录里面，然后返回创建好的版本标识字符串
   * @param id {String} -可选 为了多处均可获得一个相同的版本号，则须指定版本号对应的id，否则每次调用都将产生不一样的版本号
   * @returns {string}
   */
  createVersionTag(id) {
    const versionHistory = this.getVersionHistory()
    let versionTag = dayjs().format('YYYY-MM-DD HH:mm:ss')
    let needSaveToLog = true

    if (id) {
      if (this._versionTagCache_[id]) {
        versionTag = this._versionTagCache_[id]
        needSaveToLog = false
      } else {
        this._versionTagCache_[id] = versionTag
      }
    }

    if (needSaveToLog) {
      /* 添加到入日志，以便日后追踪查看 */
      versionHistory.push(versionTag)

      /* 只保留最近500个版本的记录 */
      if (versionHistory.length > 500) {
        versionHistory.shift()
      }

      versionLog.writeToNodeSync('versions', versionHistory)
    }

    return versionTag
  },
}

module.exports = timeVersion
