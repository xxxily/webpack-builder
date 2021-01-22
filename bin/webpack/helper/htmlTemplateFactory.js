/*!
 * @name         htmlTemplateFactory.js
 * @description  html模板文件加工工厂，本模块主要负责提取html模板和注入公共代码
 * @version      0.0.1
 * @author       Blaze
 * @date         2021/1/17 16:19
 * @github       https://github.com/xxxily
 */

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const projConf = require('../config/proj')
const rootPath = require('../../utils/rootPath')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const htmlTemplateFactory = {
  /* 存储模板页对象 */
  templatePages: null,
  /**
   * 获取模板文件
   * @returns {*|string}
   */
  getTemplatePages(entrys) {
    const t = this
    if (t.templatePages) {
      return t.templatePages
    } else {
      const result = {}
      for (const key in entrys) {
        const val = entrys[key]
        result[key] = val.replace(/\.(js|ts)$/, '.html')
      }
      t.templatePages = result
      return t.templatePages
    }
  },
  /**
   * 设置需要注入的内容 后面可以通过重写这个方法来注入自己想要的内容
   * @param $template {templateDom} -必选，html模板的dom对象，
   * 重写setInjectContent方法的时候可以通过操纵类似操纵jq对象的形式来注入内容
   * 注意，注入完后一定要把$template重新返回，才能确保被正确读取
   * @returns {*} 返回 $template
   */
  setInjectContent($template) {
    /*
    // 这是重写示例
    let injectContent = `
      <script>
        console.info('你可以通过重写 setInjectContent 方法来注入自己想要的内容哟~');
      </script>
    `;
    $template('head title').after(injectContent);
    return $template;
    */
    return $template
  },
  /**
   * 获取HTML模板内容，并注入公共代码
   * @param templatePagesUrl
   */
  getTemplateContent(templatePagesPath, arg) {
    const t = this
    const filePath = path.resolve(rootPath, templatePagesPath)
    let htmlTemplate = ''

    /* 读取默认模板 */
    try {
      htmlTemplate = fs.readFileSync(filePath)
    } catch (e) {
      console.error('读取HTML模板时出错，请检查：' + filePath + ' 下面是否有对应的文件')
      throw e
    }

    /* 注入公共内容 */
    const $ = cheerio.load(htmlTemplate.toString())
    let templateContent = t.setInjectContent($, filePath, arg)

    if (typeof templateContent !== 'string' && templateContent.html) {
      templateContent = templateContent.html()
    } else {
      // 返回结果错误则使用默认模板内容
      templateContent = htmlTemplate
    }

    return templateContent
  },
  /**
   * 提取 HtmlWebpackPlugin 配置数据
   * @param entry {object} -必选，webpack的入口配置，因为需要进行对比
   * @returns {Array}
   */
  extractHtmlWebpackPluginConf(entrys) {
    const t = this
    const templatePages = t.getTemplatePages(entrys)
    const htmlWebpackPluginConf = []

    /* html文件模板配置 HtmlWebpackPlugin */
    for (const fileName in templatePages) {
      /* 基本配置 */
      const conf = {
        filename: fileName + '.html',
        /* 模板路径 */
        template: templatePages[fileName],
        templateContent: function (arg) {
          return t.getTemplateContent(templatePages[fileName], arg)
        },
        inject: true,
      }

      /* 判断是否需要压缩HTML模板 */
      const isMinify = projConf.minifyHtmlTemplate || false
      if (isMinify === true) {
        conf.minify = {
          removeComments: false,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
        }
      }

      if (fileName in entrys) {
        conf.chunks = ['common', 'manifest', 'vendor', fileName]
        conf.hash = false
      }

      htmlWebpackPluginConf.push(conf)
    }

    return htmlWebpackPluginConf
  },
  createHtmlWebpackPlugins(entrys) {
    const htmlWebpackPluginArr = []
    const htmlWebpackPluginConf = htmlTemplateFactory.extractHtmlWebpackPluginConf(entrys)
    htmlWebpackPluginConf.forEach(function (conf) {
      htmlWebpackPluginArr.push(new HtmlWebpackPlugin(conf))
    })
    return htmlWebpackPluginArr
  },
}

/* 统一给HTML模板注入内容 */
if (projConf.setInjectContent instanceof Function) {
  htmlTemplateFactory.setInjectContent = projConf.setInjectContent
}

module.exports = htmlTemplateFactory
