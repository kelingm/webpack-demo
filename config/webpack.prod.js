const { merge } = require('webpack-merge');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const common = require('./webpack.common.js');
const copyWebpackPlugin = require('../plugin/copyWebpackPlugin.js');

module.exports = merge(common, {
  // devtool: "source-map",
  mode: 'none',
  devtool: false,
  optimization: {
    usedExports: true,
    concatenateModules: true,
    // moduleIds: 'deterministic',
    moduleIds: 'named',
    // moduleIds: 'natural',
    // runtimeChunk: {
    //   name: (entrypoint) => `runtime~${entrypoint.name}`,
    // },
    runtimeChunk: 'single',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      // 与 webpackOptions.output 中的选项相似
      // 所有的选项都是可选的
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new ScriptExtHtmlWebpackPlugin({
      // `runtime` must same as runtimeChunk name. default is `runtime`
      inline: /runtime\..*\.js$/,
    }),
    new copyWebpackPlugin({ name: 'why' }),
  ],
});
