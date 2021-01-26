const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// const LocalStoragePlugin = require("../plugin/localStoragePlugin");
const webpack = require('webpack');
const glob = require('glob');

const setMPA = () => {
  const entry = {};
  const htmlWebpackPlugins = [];
  // 按照上面说的格式来动态获取入口文件
  const entryFiles = glob.sync(path.join(__dirname, '../src/pages/*/index.js'));

  entryFiles.map(entryFile => {
    const match = entryFile.match(/src\/pages\/(.*)\/index.js/);
    const pageName = match && match[1];
    entry[pageName] = entryFile;
    htmlWebpackPlugins.push(
      new HtmlWebpackPlugin({
        // template: path.join(__dirname, `src/${pageName}/index.html`),
        template: path.join(__dirname, `../src/index.ejs`),

        filename: `${pageName}.html`,
        chunks: [`${pageName}`],
        // inject: true,
        // minify: {
        //   html5: true,
        //   collapseWhitespace: true,
        //   preserveLineBreaks: false,
        //   minifyCSS: true,
        //   minifyJS: true,
        //   removeComments: false,
        // },
      })
    );
  });
  return {
    entry,
    htmlWebpackPlugins,
  };
};
const { entry, htmlWebpackPlugins } = setMPA();

module.exports = {
  entry,
  optimization: {
    moduleIds: 'named',
    splitChunks: {
      chunks: 'all',
    },
  },
  module: {
    rules: [
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          // 'style-loader',
          // 将 CSS 转化成 CommonJS 模块
          'css-loader',
          'sass-loader',
        ],
        sideEffects: true, // 否则会导致css无法import， 因为开启了treeshaking
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ['file-loader'],
      },
    ],
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../dist'),
    // publicPath: "./",
  },
  plugins: [
    // new LocalStoragePlugin({
    //   jsOmit: /(async-)|(chunk-)/,
    //   cssOmit: /(async-)|(chunk-)/,
    //   type: "indexedDB",
    //   debug: true,
    //   dbConf: {
    //     dbName: "test",
    //     version: 1,
    //     storeName: "cache",
    //     storeKey: "path",
    //   },
    // }),
  ].concat(htmlWebpackPlugins),
};
