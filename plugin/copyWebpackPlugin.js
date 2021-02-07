/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const pluginName = 'CopyWebpackPlugin';

class copyWebpackPlugin {
  constructor(options) {
    console.log('hello, my plugin', options.name);
  }

  /**
   * 插件在调用时，需要执行的函数
   * @param {*} compiler webpack实例.compiler 对象代表了完整的 webpack 环境配置。这个对象在启动 webpack 时被一次性建立
   */
  apply(compiler) {
    compiler.hooks.emit.tapAsync(pluginName, (compilation, cb) => {
      // compilation 对象代表了一次资源版本构建。当运行 webpack 开发环境中间件时，每当检测到一个文件变化，就会创建一个新的 compilation，从而生成一组新的编译资源。一个 compilation 对象表现了当前的模块资源、编译生成资源、变化的文件、以及被跟踪依赖的状态信息。compilation 对象也提供了很多关键时机的回调，以供插件做自定义处理时选择使用。
      const copyrightText = 'copyright by why';
      compilation.assets['copyright.txt'] = {
        source() {
          return copyrightText;
        },
        size() {
          return copyrightText.length;
        },
      };
      cb();
    });
  }
}
module.exports = copyWebpackPlugin;
