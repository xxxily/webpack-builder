/**
 * https://github.com/wendux/Ajax-hook
 */
;(function (ob) {
  var realXhr = "RealXMLHttpRequest"
  ob.hookAjax = function (proxy) {
    window[realXhr] = window[realXhr] || XMLHttpRequest

    XMLHttpRequest = function () {
      var xhr = new window[realXhr];

      for (var attr in xhr) {
        var type = "";
        try {
          type = typeof xhr[attr]
        } catch (e) {
        }
        if (type === "function") {
          this[attr] = hookFunction(attr);
        } else {
          Object.defineProperty(this, attr, {
            get: getterFactory(attr),
            set: setterFactory(attr),
            enumerable: true
          })
        }
      }
      this.xhr = xhr;

    }

    // Generate getter for attributes of xhr
    function getterFactory(attr) {
      return function () {
        var v = this.hasOwnProperty(attr + "_") ? this[attr + "_"] : this.xhr[attr];
        var attrGetterHook = (proxy[attr] || {})["getter"]
        return attrGetterHook && attrGetterHook(v, this) || v
      }
    }

    function setterFactory(attr) {
      return function (v) {
        var xhr = this.xhr;
        var that = this;
        var hook = proxy[attr];
        if (typeof hook === "function") {
          xhr[attr] = function () {
            proxy[attr](that) || v.apply(xhr, arguments);
          }
        } else {
          //If the attribute isn't writable, generate proxy attribute
          var attrSetterHook = (hook || {})["setter"];
          v = attrSetterHook && attrSetterHook(v, that) || v
          try {
            xhr[attr] = v;
          } catch (e) {
            this[attr + "_"] = v;
          }
        }
      }
    }

    // Hook methods of xhr.
    function hookFunction(fun) {
      return function () {
        var args = [].slice.call(arguments)
        if (proxy[fun] && proxy[fun].call(this, args, this.xhr)) {
          return;
        }
        return this.xhr[fun].apply(this.xhr, args);
      }
    }

    return window[realXhr];
  }

  // Cancel hook
  ob.unHookAjax = function () {
    if (window[realXhr]) XMLHttpRequest = window[realXhr];
    window[realXhr] = undefined;
  }

  ob["default"] = ob;
})(window);


;(function (window) {

  function parseURL(url) {
    var a = document.createElement('a')
    a.href = url
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: a.port,
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
          ret[key] = val
        }
        return ret
      })()
    }
  }

  function isArr(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]'
  }

  var urlParams = parseURL(window.location.href).params

  /* 判断是否需要进行mock */
  function isNeedMock(url) {
    var mockFilter = decodeURIComponent(urlParams.mock)

    if (url && window._isAllowMock_ && mockFilter) {
      /* 使用了全局mock配置则直接true */
      if (window._isAllowMock_ === 'all' || mockFilter === 'all') {
        return true
      }

      /* 根据当前页面参数信息判断要不要使用mock */
      if (mockFilter) {
        var filterArr = []
        try {
          /* 同时支持,分隔或数组 */
          var tmpArr = mockFilter.split(',')
          if (tmpArr.length >= 2) {
            filterArr = tmpArr
          } else {
            var filter = JSON.parse(mockFilter)
            if (isArr(filter)) {
              filterArr = filter
            }
          }
        } catch (e) {
          filterArr = [mockFilter]
        }

        /* 只要url里包含过滤字符则表示需要mock */
        for (var i = 0; i < filterArr.length; i++) {
          var filter = filterArr[i]
          if (url.match(filter) && !url.match('mock/')) {
            return true
          }
        }
      }
    }

    return false
  }

  function getMockUrl(url) {
    var info = parseURL(url)
    var protocol = info.protocol + '://'
    var port = info.port ? ':' + info.port : ''
    return protocol + info.host + port + '/mock' + info.relative
  }


  hookAjax({
    //拦截方法
    open: function (arg, xhr) {
      var url = arg[1]
      var exclude = /(sockjs\-node|hot\-update|mock\/)/

      if (url && !exclude.test(url) && isNeedMock(url)) {
        arg[1] = getMockUrl(url)
        console.warn('以下接口开启了mock选项，注意不要搞混数据源：\n', url, xhr)
      }
    }
  })
})(window);
