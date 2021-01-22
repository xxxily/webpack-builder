/*!
 *  qwGuard bese on AlloyLever
 *  AlloyLever Github: https://github.com/AlloyTeam/AlloyLever
 *  MIT Licensed.
 */
;(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object')
    module.exports = factory()
  else if (typeof define === 'function' && define.amd)
    define([], factory)
  else if (typeof exports === 'object')
    exports['qwGuard'] = factory()
  else
    root['qwGuard'] = factory()
})(window, function () {
  var qwGuard = {}

  /* 允许通过debugToolsConfig配置调试工具的cdn地址 */
  var debugToolsConfig = window._debugToolsConfig_ || {}
  var cdnConfig = debugToolsConfig.cdn || {}

  /* 默认配置 */
  qwGuard.settings = {
    vconsole: cdnConfig.vconsole || '//cdn.bootcdn.net/ajax/libs/vConsole/3.3.4/vconsole.min.js',
    eruda: cdnConfig.eruda || '//cdn.bootcdn.net/ajax/libs/eruda/2.4.1/eruda.min.js',
    reportUrl: null,
    reportPrefix: '',
    reportKey: 'msg',
    otherReport: null,
    entry: null
  }

  /*数据存储*/
  qwGuard.store = []

  /**
   * 劫持console下的相关方法，实现调用监听，
   * 劫持会导致console源码定位功能丧失
   * 所以只在要开启vconsole的情况下劫持
   */
  qwGuard.consoleHooks = function () {
    if (qwGuard._hasConsoleHooks_) {
      return false
    }

    var methodList = ['log', 'info', 'warn', 'debug', 'error']
    methodList.forEach(function (item) {
      var method = console[item]

      console[item] = function () {
        qwGuard.store.push({
          logType: item,
          logs: arguments
        })

        method.apply(console, arguments)
      }
    })

    qwGuard._hasConsoleHooks_ = true
  }

  /*进行初始化配置*/
  qwGuard.config = function (config) {
    for (var i in config) {
      if (config.hasOwnProperty(i)) {
        qwGuard.settings[i] = config[i]
      }
    }

    if (config.entry) {
      window.addEventListener('load', function () {
        qwGuard.entry(config.entry)
      })
    }

    var parameter = getParameter('vconsole')

    if (parameter) {
      if (parameter === 'show') {
        qwGuard.vConsole(true)
      } else {
        qwGuard.vConsole(false)
      }
    }
  }

  /*控制vConsole的显隐*/
  qwGuard.vConsole = function (show) {
    qwGuard.consoleHooks()
    loadScript(qwGuard.settings.vconsole, function () {
      //support vconsole3.0
      if (typeof vConsole === 'undefined') {
        window.vConsole = new VConsole({
          defaultPlugins: ['system', 'network', 'element', 'storage'],
          maxLogNumber: 5000
        })
      }

      var i = 0,
        len = qwGuard.store.length

      for (; i < len; i++) {
        var item = qwGuard.store[i]
        //console[item.type].apply(console, item.logs)
        //prevent twice log
        item.noOrigin = true
        window.vConsole.pluginList.default.printLog(item)

        /*TODO 待优化 输出之前的记录信息，到 VConsole*/
        var logType = item.logType
        if (logType && console[logType]) {
          console[logType]('qwGuard store message:', item)
        }
      }

      if (show) {
        try {
          window.vConsole.show()
        } catch (e) {
        }

        window.addEventListener('load', function () {
          window.vConsole.show()
        })
      }
    })
  }

  qwGuard.eruda = function () {
    loadScript(qwGuard.settings.eruda, function () {
      window.eruda && window.eruda.init()
    })
  }

  /*根据URL参数判断是否需要打开vconsole*/
  var vconsoleParameter = getParameter('vconsole')
  if (vconsoleParameter) {
    if (vconsoleParameter === 'show') {
      qwGuard.vConsole(true)
    } else {
      qwGuard.vConsole(false)
    }
  }

  /*根据URL参数判断是否需要打开eruda*/
  var erudaParameter = getParameter('eruda')
  if (erudaParameter) {
    qwGuard.eruda()
  }

  /**
   * 配置调试开关
   * @param selector {string} -必选 开关按钮选择器
   * @param openCount {number} -可选 点击多少次后打开，默认5次
   * @param timeout {number} -可选 规定时间内点够 openCount 次才能正常打开，否则超时了，要重新点击才行， 默认 1000*10 ms
   */
  qwGuard.entry = function (selector, openCount, timeout) {
    var count = 0,
      timer = null,
      entry = document.querySelector(selector)
    if (entry) {
      entry.addEventListener('click', function () {
        count++
        if (count > openCount || 5) {
          count = -100000
          qwGuard.vConsole(true)
        }

        /*超时重置*/
        if (!timer) {
          timer = setTimeout(function () {
            timer = null
            count = 0
          }, timeout || 1000 * 10)
        }
      })
    }
  }

  /* 初始化存在在LocalStorage里面的调试选项 */
  qwGuard.initLocalStorageConf = function () {
    try {
      var debugConf = JSON.parse(localStorage.getItem('_debug_config_') || '{}')

      /* 根据限时信息决定要不要开启调试模式 */
      if (debugConf.enableMinute && debugConf.enableTime) {
        var curTime = new Date().getTime()
        var interval = (curTime - debugConf.enableTime) / 1000 / 60
        if (interval < 0 || interval > debugConf.enableMinute) {
          /* 移除已失效的调试配置 */
          localStorage.removeItem('_debug_config_')
          return false
        }
      }

      window.__debugMode__ = window.__debugMode__ || debugConf.debugMode
      var debugToolsConfig = window._debugToolsConfig_ || {}
      for (var key in debugConf) {
        if (debugConf[key]) {
          debugToolsConfig[key] = debugConf[key]
        }
      }
      window._debugToolsConfig_ = debugToolsConfig

      /* 使用自定义cdn */
      var customCdn = debugToolsConfig.cdn
      if (customCdn) {
        qwGuard.settings.eruda = customCdn.eruda || qwGuard.settings.eruda
        qwGuard.settings.vconsole = customCdn.vconsole || qwGuard.settings.vconsole
      }
    } catch (e) {
      console.error('localStorage debug config init error', e)
    }
  }

  /**
   * 执行远端预设配置
   * @param configUrl {String} -可选 远端配置的文件的URL地址
   * @param presetConfig {Object} -可选 预设配置内容
   * @param callback {Function} -可选 执行完预设后的回调操作
   */
  qwGuard.executeRemotePreset = function (configUrl, presetConfig, callback) {
    if (configUrl) {
      ajax({
        url: configUrl,
        cache: false,
        success: function (res) {
          executePreset(res)
          callback && callback(res)
        }
      })
    } else {
      presetConfig && executePreset(presetConfig)
      callback && callback(presetConfig)
    }

    function executePreset (preset) {
      if (preset.lastVersion) {
        if (preset.isClearHtmlCache || window._clearHtmlCache_) {
          var curVersion = window._lastVersion_ || window._publicTime_
          if (preset.lastVersion !== curVersion) {
            /* 为了避免死循环地刷新，还需判断当前是否已被刷新过 */
            var urlObj = parseURL(location.href)
            var curTime = new Date().getTime()
            var lastClearCacheTime = Number(urlObj.params.visitVersion || '')
            if (!lastClearCacheTime || (curTime - lastClearCacheTime > 1000 * 60 * 1)) {
              clearHtmlCache()
            }
          }
        }
      }

      /* 加载并运行指定的预设脚本 */
      if (preset.scriptUrl && typeof preset.scriptUrl === 'string') {
        loadScript(preset.scriptUrl, function () {})
      }
    }
  }

  /**
   * 初始化 qwGuard
   * @param defaultRhythm {boolean} - 可选，初始化一个默认节律来响应加载调试工具，默认false
   */
  qwGuard.init = function () {
    qwGuard.initLocalStorageConf()

    /*根据页面全局变量自动加载*/
    var debugConf = window._debugToolsConfig_
    if (debugConf) {
      if (debugConf.vconsole) {
        qwGuard.vConsole()
      }
      if (debugConf.eruda) {
        qwGuard.eruda()
      }
    }
  }

  /*错误日志记录*/
  qwGuard.logs = []

  /*全局错误信息监听*/
  window.addEventListener('error', function (msg, url, line, col, error) {

    var newMsg = msg

    if (error && error.stack) {
      newMsg = processStackMsg(error)
    }

    if (isOBJByType(newMsg, 'Event')) {
      newMsg += newMsg.type ?
        ('--' + newMsg.type + '--' + (newMsg.target ?
          (newMsg.target.tagName + '::' + newMsg.target.src) : '')) : ''
    }

    newMsg = (newMsg + '' || '').substr(0, 500)

    qwGuard.logs.push({
      msg: newMsg,
      target: url,
      rowNum: line,
      colNum: col,
      errorMsg: msg
    })

    if (msg.toLowerCase && msg.toLowerCase().indexOf('script error') > -1) {
      console.error('Script Error: See Browser Console for Detail')
    } else {
      console.error(msg)
    }

    var ss = qwGuard.settings
    if (ss.reportUrl) {
      var src = ss.reportUrl + (ss.reportUrl.indexOf('?') > -1 ? '&' : '?') + ss.reportKey + '=' + (ss.reportPrefix ? ('[' + ss.reportPrefix + ']') : '') + newMsg + '&t=' + new Date().getTime()
      if (ss.otherReport) {
        for (var i in ss.otherReport) {
          if (ss.otherReport.hasOwnProperty(i)) {
            src += '&' + i + '=' + ss.otherReport[i]
          }
        }
      }
      new Image().src = src
    }

    return true
  })

  /**
   * 动态加载脚本文件
   * @param src {string} -必选 脚本文件地址
   * @param callback {function} -必选 加载成功的回调函数
   */
  function loadScript (src, callback) {
    var s,
      r,
      t
    r = false
    s = document.createElement('script')
    s.type = 'text/javascript'
    s.src = src

    s.onload = s.onreadystatechange = function () {
      //console.log( this.readyState ); //uncomment this line to see which ready states are called.
      if (!r && (!this.readyState || this.readyState == 'complete')) {
        r = true
        callback()
      }
    }

    t = document.getElementsByTagName('script')[0]
    t.parentNode.insertBefore(s, t)
  }

  function ajax (options) {
    options = options || {}
    options.type = (options.type || 'GET').toUpperCase()
    options.data = options.data || {}
    options.dataType = options.dataType || 'json'
    options.async = typeof options.async === 'undefined' ? true : options.async
    options.cache = typeof options.cache === 'undefined' ? true : options.cache

    function getParams (data) {
      var arr = []
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
        }
      }
      return arr.join('&')
    }

    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        var status = xhr.status
        if (status >= 200 && status < 300) {
          var res = xhr.responseText
          if (options.dataType === 'json') {
            try {
              res = JSON.parse(res)
            } catch (e) {
              return options.fail && options.fail(xhr)
            }
          }
          options.success && options.success(res, xhr)
        } else {
          options.fail && options.fail(xhr)
        }
      }
    }

    if (options.type === 'GET') {
      if (!options.cache) { options.data._no_cache_ = new Date().getTime() }
      var params = getParams(options.data)
      var url = options.url || ''
      if (params) {
        url = /\?/.test(url) ? url + '&' + params : url = url + '?' + params
      }
      xhr.open('GET', url, options.async)
      xhr.send(null)
    } else if (options.type === 'POST') {
      xhr.open('POST', options.url, options.async)
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
      xhr.send(getParams(options.data) || null)
    }
  }

  function clearHtmlCache () {
    var urlObj = parseURL(location.href)
    urlObj.params.visitVersion = new Date().getTime()
    var newUrl = stringifyToUrl(urlObj)
    window.location.replace(newUrl)
  }

  qwGuard.clearHtmlCache = clearHtmlCache

  /**
   * 参考示例：
   * https://segmentfault.com/a/1190000006215495
   * 注意：该方法必须依赖浏览器的DOM对象
   */
  function parseURL (url) {
    var a = document.createElement('a')
    a.href = url || location.href
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: a.port,
      origin: a.origin,
      search: a.search,
      query: a.search,
      file: (a.pathname.match(/\/([^/?#]+)$/i) || ['', ''])[1],
      hash: a.hash.replace('#', ''),
      path: a.pathname.replace(/^([^/])/, '/$1'),
      relative: (a.href.match(/tps?:\/\/[^/]+(.+)/) || ['', ''])[1],
      params: (function () {
        var ret = {}
        var seg = []
        var paramArr = a.search.replace(/^\?/, '').split('&')

        for (var i = 0; i < paramArr.length; i++) {
          var item = paramArr[i]
          if (item !== '' && item.indexOf('=')) {
            seg.push(item)
          }
        }

        for (var j = 0; j < seg.length; j++) {
          var param = seg[j]
          var idx = param.indexOf('=')
          var key = param.substring(0, idx)
          var val = param.substring(idx + 1)
          if (!key) {
            ret[val] = null
          } else {
            ret[key] = val
          }
        }
        return ret
      })()
    }
  }

  /**
   * 将params对象转换成字符串模式
   * @param params {Object} - 必选 params对象
   * @returns {string}
   */
  function stringifyParams (params) {
    var strArr = []

    if (!Object.prototype.toString.call(params) === '[object Object]') {
      return ''
    }

    for (var key in params) {
      if (Object.hasOwnProperty.call(params, key)) {
        var val = params[key]
        var valType = Object.prototype.toString.call(val)

        if (val === '' || valType === '[object Undefined]') continue

        if (val === null) {
          strArr.push(key)
        } else if (valType === '[object Array]') {
          strArr.push(key + '=' + val.join(','))
        } else {
          val = (JSON.stringify(val) || '' + val).replace(/(^"|"$)/g, '')
          strArr.push(key + '=' + val)
        }
      }
    }
    return strArr.join('&')
  }

  /**
   * 将通过parseURL解析出来url对象重新还原成url地址
   * 主要用于查询参数被动态修改后，再重组url链接
   * @param obj {Object} -必选 parseURL解析出来url对象
   */
  function stringifyToUrl (urlObj) {
    var query = stringifyParams(urlObj.params) || ''
    if (query) { query = '?' + query }
    var hash = urlObj.hash ? '#' + urlObj.hash : ''
    return urlObj.origin + urlObj.path + query + hash
  }

  /*获取链接后面的控制参数*/
  function getParameter (n) {
    var m = window.location.hash.match(new RegExp('(?:#|&)' + n + '=([^&]*)(&|$)')),
      result = !m ? '' : decodeURIComponent(m[1])
    return result || getParameterByName(n)
  }

  /*根据名称获取对应参数*/
  function getParameterByName (name, url) {
    if (!url) url = window.location.href
    name = name.replace(/[\[\]]/g, '\\$&')
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url)
    if (!results) return null
    if (!results[2]) return ''
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
  }

  /*判断是否为对象*/
  function isOBJByType (o, type) {
    return Object.prototype.toString.call(o) === '[object ' + (type || 'Object') + ']'
  }

  /*处理错误信息提示*/
  function processStackMsg (error) {
    var stack = error.stack
    .replace(/\n/gi, '')
    .splitreportUrl(/\bat\b/)
    .slice(0, 9)
    .join('@')
    .replace(/\?[^:]+/gi, '')
    var msg = error.toString()
    if (stack.indexOf(msg) < 0) {
      stack = msg + '@' + stack
    }
    return stack
  }

  /*获取cookie信息*/
  function getCookie (name) {
    var arr, reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)')
    if (arr = document.cookie.match(reg)) {
      return unescape(arr[2])
    } else {
      return null
    }
  }

  qwGuard.getCookie = getCookie
  qwGuard.getParameter = getParameter
  qwGuard.loadScript = loadScript

  return qwGuard
})

/*自动初始化 qwGuard*/
try {
  qwGuard.init()

  if (window._executeRemotePreset_) {
    /* 执行远端预设，实现自动清缓存等功能 */
    qwGuard.executeRemotePreset('./static/data/appStatus.html', null, function (data) {
      window._appStatus_ = data
    })
  }
} catch (e) {
  console.error('qwGuard error:', e)
}

/**
 * 发布的时候请对该文件进行压缩和加密
 * 在线压缩和加密工具：https://tool.css-js.com/
 * 先点击Uglify压缩，再点JSPacker加密
 */


