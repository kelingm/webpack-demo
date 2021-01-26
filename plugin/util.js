module.exports = {
  /**
   * 生成缓存逻辑代码，支持localstorage和indexedDB
   * @method generateLocalForage
   * @return {Object} script对象
   */
  generateLocalForage() {
    const localForage = function () {
      window._staticCache = window._staticCache || { js: [], css: [] };
      // 包装公共方法
      window._htmlCacheUtil = window._htmlCacheUtil || {};
      // 打印log
      window._htmlCacheUtil.showLog = function () {
        if (/supportCacheDebug=1/.test(location.search)) {
          console.log.apply(window, arguments);
        }
      };
      // 获取indexedDB，不支持则返回undefined
      window._htmlCacheUtil.getIDB = function () {
        return (
          window.indexedDB ||
          window.webkitIndexedDB ||
          window.mozIndexedDB ||
          window.OIndexedDB ||
          window.msIndexedDB ||
          undefined
        );
      };
      // 缓存配置，读取webpack中缓存配置
      window._htmlCacheUtil.cacheConfigure = function (options) {
        if (typeof options === "string") {
          options = JSON.parse(options);
        }

        window._htmlCacheUtil.showLog("缓存配置：", options);
        // 根据浏览器支持的缓存类型，修正用户设置的缓存类型
        // 目前判断类型含两种：localstorage和indexedDB
        var supportIndexedDB = !!window._htmlCacheUtil.getIDB();
        var supportLocalStorage = !!window.localStorage;
        // 默认是localstorage类型，兼容老版本
        var type = options.type || "localstorage";
        // 指定indexedDB，但浏览器不支持，则降级为localstorage
        if (type === "indexedDB" && !supportIndexedDB) {
          type = "localstorage";
        }

        if (type === "localstorage" && !supportLocalStorage) {
          type = "";
        }

        window._htmlCacheUtil.showLog("最终的缓存类型：", type);

        window._htmlCacheUtil.cacheConf = {
          // 缓存方式
          type: type,
          // indexedDB类型的配置
          dbConf: options.dbConf,
        };
      };
      // 链接数据库，不支持indexDB则返回null，支持则返回IDBRequest对象
      window._htmlCacheUtil.openDataBase = function (dbConf) {
        var idb = window._htmlCacheUtil.getIDB();
        var request = null;
        if (idb) {
          request = idb.open(dbConf.dbName, dbConf.version);
          request.addEventListener("upgradeneeded", function (event) {
            var db = event.target.result;
            if (!db.objectStoreNames.contains(dbConf.storeName)) {
              var store = db.createObjectStore(dbConf.storeName, {
                keyPath: dbConf.storeKey,
              });
              // 创建不带hash的路径索引，用于删除过期缓存
              store.createIndex("pathNoHash", "pathNoHash");
            }
          });
        }

        return request;
      };
      // 获取对象仓库，支持传入回调函数
      window._htmlCacheUtil.getObjectStore = function (
        dbConf,
        successCb,
        failCb
      ) {
        var request = window._htmlCacheUtil.openDataBase(dbConf);
        // 链接数据库成功
        if (request) {
          request.addEventListener("success", function (event) {
            var db = event.target.result;
            var transaction = db.transaction(dbConf.storeName, "readwrite");
            var objectStore = transaction.objectStore(dbConf.storeName);
            successCb && successCb(objectStore);
          });
          request.addEventListener("error", function () {
            failCb && failCb();
          });
        } else {
          failCb && failCb();
        }
      };
      window._htmlCacheUtil.setItem = function (key, value) {
        var conf = window._htmlCacheUtil.cacheConf;
        // 使用indexedDB
        if (conf.type === "indexedDB") {
          window._htmlCacheUtil.getObjectStore(
            conf.dbConf,
            function (objectStore) {
              // 添加数据，同时设立一个路径不携带hash的索引
              var reg = /(.*)\.[0-9a-z]*(\.js|\.css)/;
              var oldResult = reg.exec(key);
              var pathNoHash =
                oldResult[1] && oldResult[2]
                  ? oldResult[1] + oldResult[2]
                  : key;
              var addData = {
                content: value,
                pathNoHash: pathNoHash,
              };
              addData[conf.dbConf.storeKey] = key;
              var addRequest = objectStore.add(addData);
              addRequest.addEventListener("success", function (event) {
                window._htmlCacheUtil.showLog("indexedDB: 添加数据成功", key);
              });
            },
            function () {}
          );
        }
        // 使用localstorage
        else {
          localStorage.setItem(key, value);
          window._htmlCacheUtil.showLog("localstorage: 添加数据成功", key);
        }
      };
      window._htmlCacheUtil.getItem = function (key, successCb, failCb) {
        var conf = window._htmlCacheUtil.cacheConf;
        // 使用indexedDB
        if (conf.type === "indexedDB") {
          window._htmlCacheUtil.getObjectStore(
            conf.dbConf,
            function (objectStore) {
              // 添加数据
              var getRequest = objectStore.get(key);
              getRequest.addEventListener("success", function (event) {
                var result = event.target.result || {};
                var cache = result.content;
                if (cache) {
                  window._htmlCacheUtil.showLog("indexedDB: 查询数据成功", key);
                  successCb && successCb(cache);
                } else {
                  failCb && failCb();
                }
              });
              getRequest.addEventListener("error", function (event) {
                window._htmlCacheUtil.showLog("indexedDB: 查询数失败", key);
                failCb && failCb();
              });
            },
            function () {}
          );
        }
        // 使用localstorage
        else {
          var cache = localStorage.getItem(key);
          if (cache) {
            successCb && successCb(cache);
            window._htmlCacheUtil.showLog("localstorage: 查询数据成功", key);
          } else {
            window._htmlCacheUtil.showLog("localstorage: 查询数据为空", key);
            failCb && failCb();
          }
        }
      };
      window._htmlCacheUtil.removeItem = function (key) {
        var conf = window._htmlCacheUtil.cacheConf;
        // 使用indexedDB
        if (conf.type === "indexedDB") {
          window._htmlCacheUtil.getObjectStore(
            conf.dbConf,
            function (objectStore) {
              // 删除数据
              var deleteRequest = objectStore.delete(key);
              deleteRequest.addEventListener("success", function (event) {
                window._htmlCacheUtil.showLog("indexedDB: 删除数据成功", key);
              });
            },
            function () {}
          );
        } else {
          localStorage.removeItem(key);
          window._htmlCacheUtil.showLog("localstorage: 删除数据成功", key);
        }
      };
      // 删除过期的缓存
      window._htmlCacheUtil.removeOldItem = function (cacheId) {
        var conf = window._htmlCacheUtil.cacheConf;
        var regJS = /(.*)\.[0-9a-z]*(\.js)/;
        var regCSS = /(.*)\.[0-9a-z]*(\.css)/;
        var reg = regJS.test(cacheId) ? regJS : regCSS;
        var regResult = reg.exec(cacheId);
        // 使用indexedDB
        if (conf.type === "indexedDB") {
          window._htmlCacheUtil.getObjectStore(
            conf.dbConf,
            function (objectStore) {
              var index = objectStore.index("pathNoHash");
              index.openKeyCursor().onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                  // cursor.key 是一个 name, 就像 "Bill", 然后 cursor.primaryKey 是唯一键。
                  if (
                    cursor.key &&
                    regResult &&
                    regResult[1] &&
                    regResult[1] + regResult[2] === cursor.key
                  ) {
                    window._htmlCacheUtil.removeItem(cursor.primaryKey);
                  }

                  cursor.continue();
                }
              };
            },
            function () {}
          );
        } else {
          // 为了防止localstorage存储溢出，需要过期的缓存进行处理，默认采用chunk的hash值做新旧区分
          for (var i = 0, len = localStorage.length; i < len; i++) {
            var key = localStorage.key(i);
            var oldResult = reg.exec(key);
            if (
              regResult &&
              oldResult &&
              regResult[1] &&
              oldResult[1] &&
              regResult[1] === oldResult[1] &&
              regResult[2] === oldResult[2]
            ) {
              // window._htmlCacheUtil.showLog('new cache:', regResult);
              // window._htmlCacheUtil.showLog('old cache:', oldResult);
              // localStorage.removeItem(key);
              window._htmlCacheUtil.removeItem(key);
            }
          }
        }
      };
    };
    return localForage;
  },

  /**
   * 生成插件依赖的util代码的script片段，等待插入到html头部
   * @method generateUtilScript
   * @return {Object} script对象
   */
  generateUtilScript() {
    // 生成cacheUtil片段，util代码必须为es5的语法，避免兼容性问题
    const createUtilFunc = function () {
      window._staticCache = window._staticCache || { js: [], css: [] };
      // 包装公共方法
      window._htmlCacheUtil = window._htmlCacheUtil || {};
      // 包装一个ajax请求
      window._htmlCacheUtil.getHttpRequest = function () {
        if (window.XMLHttpRequest) {
          return new XMLHttpRequest();
        } else if (window.ActiveXObject) {
          return new ActiveXObject("MsXml2.XmlHttp");
        }
      };
      // 根据资源url和类型，请求对应的资源，资源请求后，加入可缓存资源队列
      // 为了拿到js、css文件的内容，使用的是ajax 异步请求，需要注意跨域问题
      window._htmlCacheUtil.ajaxPage = function (sId, url, type) {
        var oXmlHttp = window._htmlCacheUtil.getHttpRequest();
        var cache = {
          id: sId,
          content: "",
        };
        // window._staticCache用于统计可缓存的资源
        window._staticCache[type].push(cache);
        oXmlHttp.onreadystatechange = function () {
          if (oXmlHttp.readyState === 4) {
            if (oXmlHttp.status === 200 || oXmlHttp.status === 304) {
              cache.content = oXmlHttp.responseText;
              type === "js" && window._htmlCacheUtil.runAndCacheJs();
              type === "css" && window._htmlCacheUtil.runAndCacheCss();
            }
          }
        };
        oXmlHttp.open("GET", url, true);
        oXmlHttp.send(null);
      };
      // 运行对应的js内容片段，并缓存到localstorage
      window._htmlCacheUtil.runAndCacheJs = function () {
        var jsCache = window._staticCache.js;
        // 所有js均已并行请求完毕
        var hasAllRecieved = true;
        for (var i = 0; i < jsCache.length; i++) {
          if (!jsCache[i].content) {
            hasAllRecieved = false;
          }
        }
        if (hasAllRecieved) {
          for (var j = 0; j < jsCache.length; j++) {
            var cacheSource = jsCache[j].content;
            var cacheId = jsCache[j].id;
            if (cacheSource != null && !document.getElementById(cacheId)) {
              // 执行js片段，方式为插入script标签
              var oHead = document.getElementsByTagName("HEAD").item(0);
              var oScript = document.createElement("script");
              oScript.type = "text/javascript";
              oScript.id = cacheId;
              oScript.defer = true;
              oScript.text = cacheSource;
              // 对js片段进行缓存处理
              try {
                // 删除过期缓存
                window._htmlCacheUtil.removeOldItem(cacheId);
                // localStorage.setItem(cacheId, cacheSource);
                window._htmlCacheUtil.setItem(cacheId, cacheSource);
              } catch (e) {
                window._htmlCacheUtil.showLog(
                  "html cache setetting localstorage fail:",
                  e
                );
              }
              oHead.appendChild(oScript);
            }
          }
        }
      };
      // 运行对应的css内容片段，并缓存到localstorage
      window._htmlCacheUtil.runAndCacheCss = function () {
        var cssCache = window._staticCache.css;
        // 所有css均已请求完毕
        var hasAllRecieved = true;
        for (var i = 0; i < cssCache.length; i++) {
          if (!cssCache[i].content) {
            hasAllRecieved = false;
          }
        }
        if (hasAllRecieved) {
          for (var j = 0; j < cssCache.length; j++) {
            var cacheSource = cssCache[j].content;
            var cacheId = cssCache[j].id;
            if (cacheSource != null && !document.getElementById(cacheId)) {
              // 为准备内嵌的style元素，内嵌样式，同时将css文件内容计入缓存
              var backupCss = document.querySelector(
                "style[ls_id='" + cacheId + "']"
              );
              backupCss.innerHTML = cacheSource;
              try {
                // 删除过期缓存
                window._htmlCacheUtil.removeOldItem(cacheId);
                // localStorage.setItem(cacheId, cacheSource);
                window._htmlCacheUtil.setItem(cacheId, cacheSource);
              } catch (e) {
                window._htmlCacheUtil.showLog(
                  "html cache setetting localstorage fail:",
                  e
                );
              }
            }
          }
        }
      };
      // 根据lsid检测localstorage中是否有js缓存，有缓存则运行js片段
      window._htmlCacheUtil.checkAndRunJSCache = function (lsId, quotLsId) {
        var scriptDom = document.querySelector('[ls_id="' + quotLsId + '"]');
        try {
          // var scriptFromCache = localStorage.getItem(lsId);
          window._htmlCacheUtil.getItem(
            lsId,
            function (scriptFromCache) {
              // scriptDom.text = (new Function(scriptFromCache))();
              // 废弃new Function方式，原因是：不便于js报错的异常搜集
              // 插入到原dom之前
              var oScript = document.createElement("script");
              oScript.type = "text/javascript";
              oScript.text = scriptFromCache;
              scriptDom.parentElement.insertBefore(oScript, scriptDom);
            },
            function () {
              window._htmlCacheUtil.ajaxPage(lsId, lsId, "js");
            }
          );
        } catch (err) {
          scriptDom.defer = true;
          scriptDom.setAttribute("src", lsId);
        }
      };
      // 根据lsid检测localstorage中是否有css缓存，有缓存则运行css片段
      window._htmlCacheUtil.checkAndRunCssCache = function (lsId, quotLsId) {
        var cssDom = document.querySelector('style[ls_id="' + quotLsId + '"]');
        try {
          // var cssFromCache = localStorage.getItem(lsId);
          window._htmlCacheUtil.getItem(
            lsId,
            function (cssFromCache) {
              cssDom.innerHTML = cssFromCache;
            },
            function () {
              window._htmlCacheUtil.ajaxPage(lsId, lsId, "css");
            }
          );
        } catch (err) {
          cssDom.setAttribute("href", lsId);
        }
      };
    };

    // 在html中插入_htmlCacheUtil片段，片段为自执行函数，添加try-catch，避免插件报错导致程序终止
    let utilContent =
      "try{(" +
      this.generateLocalForage() +
      ")();" +
      "window._htmlCacheUtil.cacheConfigure(" +
      JSON.stringify(this.options) +
      ");";
    utilContent +=
      "(" +
      createUtilFunc.toString() +
      ')()} catch (err) {console.log("cachePlugin error:", err)}';
    const script = {
      tagName: "script",
      closeTag: true,
    };
    script.innerHTML = utilContent;
    script.attributes = {
      type: "text/javascript",
    };
    return script;
  },

  /**
   * script缓存代码报错，需要直接请求script资源，避免程序终中断
   * @method createScriptCacheErrorScript
   * @return {Function} 容错函数
   */
  createScriptCacheErrorScript() {
    return function (lsId, quotLsId) {
      try {
        window._htmlCacheUtil.checkAndRunJSCache(lsId, quotLsId);
      } catch (err) {
        var oHead = document.getElementsByTagName("HEAD").item(0);
        var oScript = document.createElement("script");
        oScript.type = "text/javascript";
        oScript.src = lsId;
        oHead.appendChild(oScript);
      }
    };
  },
  /**
   * style缓存代码报错，需要直接请求script资源，避免程序终中断
   * @method createStyleCacheErrorScript
   * @return {Function} 容错函数
   */
  createStyleCacheErrorScript() {
    return function (lsId, quotLsId) {
      try {
        window._htmlCacheUtil.checkAndRunCssCache(lsId, quotLsId);
      } catch (err) {
        var oHead = document.getElementsByTagName("HEAD").item(0);
        var olink = document.createElement("link");
        olink.rel = "stylesheet";
        olink.href = lsId;
        oHead.appendChild(olink);
      }
    };
  },
};
