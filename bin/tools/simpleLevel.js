/*!
 * @name         simpleLevel.js
 * @description  简单的分级模块
 * @version      0.0.1
 * @author       Blaze
 * @date         2019/1/19 23:12
 * @github       https://github.com/xxxily
 */

class SimpleLevel {
  constructor (levelMap) {
    /**
     * 默认的分级数据结构，如果觉得分级数据不合理，可以直接传进去
     */
    this.levelMap = levelMap || {
      1: {
        alias: ['beginner', '初级', '初来乍到'],
        scoreRange: [21, 100],
        comment: ['你目前处于初级水平，争取往更高级别迈进吧'],
      },
      2: {
        alias: ['intermediate', '中级', '略有小成'],
        scoreRange: [11, 20],
        comment: ['相比初级，这只是略有小成，你还可以更优秀'],
      },
      3: {
        alias: ['merit', '优秀', '渐入佳境'],
        scoreRange: [4, 10],
        comment: ['还不错，再努力下就可以炉火纯青了'],
      },
      4: {
        alias: ['distinction', '卓越', '炉火纯青'],
        scoreRange: [1, 3],
        comment: ['追求完美的你，怎可就此打住，再加把劲吧'],
      },
      5: {
        alias: ['master', '大师', '登峰造极'],
        scoreRange: [0, 0],
        comment: [
          '请继续保持~',
          '厉害了',
          '可以可以',
          '666',
          '小伙子，见你骨骼惊奇...',
          '谁都不服，就服你',
          '也许，这就是大佬吧',
          '打完，收工，上酒',
        ],
      },
    }

    /* 创建一个新实例 */
    this.create = (levelMap) => new SimpleLevel(levelMap)
  }

  /**
   * 设置分级映射数据
   * @param levelMap {object} -必选 等级映射数据，数据格式参考默认levelMap
   */
  setLevelMap (levelMap) {
    if (levelMap) this.levelMap = levelMap
  }

  /**
   * 根据得分查找当前所处的等级
   * @param score {number} -必选 具体分数
   * @returns {number} 返回等级数字，如果返回-1 当前分数没匹配到任何级别
   */
  getLevelByScore (score) {
    const t = this
    let level = -1
    const levelMap = t.levelMap

    for (const key of Object.keys(levelMap)) {
      const item = levelMap[key]
      const range = item.scoreRange
      if (score >= range[0] && score <= range[1]) {
        level = Number(key)
        break
      }
    }

    return level
  }

  /**
   * 根据别名查找当前所处的等级
   * @param alias {string} -必选 别名称谓
   * @returns {number} 返回等级数字，如果返回-1 当前分数没匹配到任何级别
   */
  getLevelByAlias (alias, levelMap) {
    const t = this
    let level = -1
    levelMap = levelMap || t.levelMap

    for (const key of Object.keys(levelMap)) {
      const item = levelMap[key]
      if (Number(key) === Number(alias) || item.alias.includes(alias)) {
        level = Number(key)
        break
      }
    }

    return level
  }

  /**
   * 取出某个范围的随机数
   * @param min
   * @param max
   * @returns {number}
   */
  random (min, max) {
    const count = max - min + 1
    return Math.floor(Math.random() * count + min)
  }

  /**
   * 根据等级的编号获取一条对当前得分的评语
   * @param levelNumber {number} -必选 等级编号，注意必须是数字，不能是别名
   * @returns {string} 返回评语内容，如果没有对应评语则返回空字符串
   */
  getCommentByLevelNumber (levelNumber) {
    const t = this
    const level = levelNumber
    const levelMap = t.levelMap
    let commentStr = ''

    const levelData = levelMap[level.toString()]
    if (levelData) {
      const comments = levelData.comment
      commentStr = comments[t.random(0, comments.length - 1)]
    }

    return commentStr
  }

  /**
   * 根据得分获取一条对当前得分的评语
   * @param score {number} -必选 具体分数
   * @returns {string} 返回评语内容，如果没有对应评语则返回空字符串
   */
  getCommentByScore (score) {
    const t = this
    const levelNumber = t.getLevelByScore(score)
    return t.getCommentByLevelNumber(levelNumber)
  }

  /**
   * 根据得分获取一条对当前得分的评语
   * @param level {number|string} -必选 等级的编号或别名
   * @returns {string} 返回评语内容，如果没有对应评语则返回空字符串
   */
  getCommentByLevel (level) {
    const t = this
    const levelNumber = t.getLevelByAlias(level)
    return t.getCommentByLevelNumber(levelNumber)
  }
}

module.exports = new SimpleLevel()
