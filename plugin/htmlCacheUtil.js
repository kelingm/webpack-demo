const _htmlCacheUtil = {
  showLog: () => {
    if (/supportCacheDebug=1/.test(location.search)) {
      console.log.apply(window, arguments);
    }
  },
};

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
window._htmlCacheUtil.getObjectStore = function (dbConf, successCb, failCb) {
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
          oldResult[1] && oldResult[2] ? oldResult[1] + oldResult[2] : key;
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
