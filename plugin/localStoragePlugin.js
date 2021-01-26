/**
 * @file index.js
 * @desc HtmlWebpackPlugin Hook插件, 用于缓存webpack产出的js和css资源，
 * 配合HtmlWebpackPlugin使用，支持HtmlWebpackPlugin v3 和 v4
 * webpack产出的js和css需以 [name].[hash].js 和 [name].[hash].css 命名
 * @author huangwenming@baidu.com
 */

const util = require("./util");
class HtmlWebpackCachePlugin {
  /**
   * 缓存插件类
   *
   * @class HtmlWebpackCachePlugin
   * @constructor 构造函数
   * @param {Object} options 配置参数
   * @param {string} options.jsOmit 滤掉的js文件，即不进行缓存处理，值为空或正则表达式
   * @param {string} options.cssOmit 滤掉的css文件，即不进行缓存处理，值为空或正则表达式
   * @param {boolean=} options.debug 是否开启debug
   */
  constructor(options) {
    this.options = options || {};
    this.isSupportDebug = options.debug;
  }

  apply(compiler) {
    let self = this;

    // 找到compilation钩子，并注册HtmlWebpackCachePlugin插件
    compiler.hooks.compilation.tap("HtmlWebpackCachePlugin", (compilation) => {
      // 获取html-webpack-plugin暴露出的AlterAssetTags钩子
      const [htmlWebpackPlugin] = compiler.options.plugins.filter(
        (plugin) => plugin.constructor.name === "HtmlWebpackPlugin"
      );
      if (!htmlWebpackPlugin) {
        console.error(
          "Unable to find an instance of HtmlWebpackPlugin in the current compilation."
        );
      }

      const alterAssetTagsHook = htmlWebpackPlugin.constructor.getHooks(
        compilation
      ).alterAssetTags;

      // 获取钩子失败，则退出
      if (!alterAssetTagsHook) {
        return;
      }

      // 监听钩子，注册回调函数
      alterAssetTagsHook.tapAsync("HtmlWebpackCachePlugin", (data, cb) => {
        // 修改webpack产出
        // 依据options中的jsOmit和cssOmit选项，进行过滤
        let options = self.options;
        let { jsOmit, cssOmit } = options;
        let [cacheScripts, styles, cacheStyles] = [[], [], []];

        let assetScripts = data.assetTags.scripts;
        let assetstyles = data.assetTags.styles;

        // 生成支持js缓存的script标签
        // 需要进行去重处理
        const scriptIsRepeat = {};
        assetScripts.map((script) => {
          let scriptPath = script.attributes.src;
          if (
            !(jsOmit && jsOmit.test(scriptPath)) &&
            !scriptIsRepeat[scriptPath]
          ) {
            scriptIsRepeat[scriptPath] = true;
            let htmlContent = "";
            const lsId = '"' + scriptPath + '"';
            const quotLsId = lsId.replace(/\"/g, "'");
            htmlContent +=
              "(" +
              util.createScriptCacheErrorScript().toString() +
              ")(" +
              lsId +
              "," +
              quotLsId +
              ")";
            script.innerHTML = htmlContent;
            script.attributes = {
              type: "text/javascript",
              ls_id: scriptPath,
            };
          }

          cacheScripts.push(script);
        });

        assetstyles.map((style) => {
          // 创建style标签，用于无缓存情况下，请求css文件之后，嵌入样式
          let stylePath = style.attributes.href;
          if (
            /\.css$/.test(stylePath) &&
            !(cssOmit && cssOmit.test(stylePath))
          ) {
            styles.push({
              tagName: "style",
              closeTag: true,
              attributes: {
                type: "text/css",
                ls_id: stylePath,
              },
            });
          }
        });
        // console.log(styles)
        // 支持css缓存，则需要把link标签修改为script标签，然后为scirpt标签注入缓存代码
        // 需要进行去重处理
        const stylesIsRepeat = {};
        assetstyles.map((style) => {
          let stylePath = style.attributes.href;
          if (
            /\.css$/.test(stylePath) &&
            !(cssOmit && cssOmit.test(stylePath)) &&
            !stylesIsRepeat[stylePath]
          ) {
            stylesIsRepeat[stylePath] = true;
            let htmlContent = "";
            const lsId = '"' + stylePath + '"';
            const quotLsId = lsId.replace(/\"/g, "'");
            htmlContent +=
              "(" +
              util.createStyleCacheErrorScript().toString() +
              ")(" +
              lsId +
              "," +
              quotLsId +
              ")";
            // htmlContent += 'window._htmlCacheUtil.checkAndRunCssCache(' + lsId + ',' + quotLsId + ')';
            cacheStyles.push({
              tagName: "script",
              closeTag: true,
              attributes: {
                type: "text/javascript",
              },
              innerHTML: htmlContent,
            });
          }
        });
        styles = styles.concat(cacheStyles);

        // 添加cacheUtil js代码到styles的头部，为了保证util的代码片段优先于其他片段执行
        const utilScript = util.generateUtilScript();
        styles.unshift(utilScript);

        data.assetTags.scripts = cacheScripts;
        data.assetTags.styles = styles;
        // Tell webpack to move on
        cb(null, data);
      });
    });
  }
}

module.exports = HtmlWebpackCachePlugin;
