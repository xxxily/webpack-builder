/*!
 * @name         deepMerge.js
 * @description  深度合并数据项，主要用于合并配置选项，
 * 由于webpack-merge合并规则的特殊性，即使自定义了合并选项，也无法完全适用于配置项的合并，所以才有了该脚本
 * 注意：该脚本并不是为了用来替代webpack-merge的，它有自身的应用场景和局限性，必须区分使用
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/17 19:11
 * @github       https://github.com/xxxily
 */

const deepMerge = {
  /**
   * 深度合并两个可枚举的对象
   * @param objA {object} -必选 对象A
   * @param objB {object} -必选 对象B
   * @param concatArr {boolean} -可选 合并数组，默认遇到数组的时候，直接以另外一个数组替换当前数组，将此设置true则，遇到数组的时候一律合并，而不是直接替换
   * @returns {*|void}
   */
  mergeObj: function (objA, objB, concatArr) {
    function isObj(obj) {
      return Object.prototype.toString.call(obj) === '[object Object]'
    }
    if (!isObj(objA) || !isObj(objB)) return objA
    function deepMerge(objA, objB) {
      const keysB = Object.keys(objB)
      keysB.forEach(function (key) {
        const subItemA = objA[key]
        const subItemB = objB[key]
        if (typeof subItemA === 'undefined') {
          objA[key] = subItemB
        } else {
          if (isObj(subItemA) && isObj(subItemB)) {
            /* 进行深层合并 */
            objA[key] = deepMerge(subItemA, subItemB)
          } else {
            if (concatArr && Array.isArray(subItemA) && Array.isArray(subItemB)) {
              objA[key] = subItemA.concat(subItemB)
            } else {
              objA[key] = subItemB
            }
          }
        }
      })
      return objA
    }
    return deepMerge(objA, objB)
  },
  /**
   * 多对象深度合并，合并规则基于mergeObj，但不存在concatArr选项
   * 合并规则是：数组直接替换、其他键值都是只要B存在都会替换或转移到A上，然后组成新的对象进行返回
   * @param objs
   * @returns {*}
   */
  merge: function (...objs) {
    const t = this
    let result = objs[0]
    objs.forEach(function (obj, index) {
      if (index) {
        result = t.mergeObj(result, obj)
      }
    })
    return result
  },
}

module.exports = deepMerge
