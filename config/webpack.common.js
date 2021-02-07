const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
// const postcssNormalize = require('postcss-normalize');

const glob = require('glob');

const useRem = true;
const setMPA = () => {
  const entry = {};
  // 按照上面说的格式来动态获取入口文件
  const entryFiles = glob.sync(path.join(__dirname, '../src/pages/*/index.js'));

  const htmlWebpackPlugins = entryFiles.map((entryFile) => {
    const match = entryFile.match(/src\/pages\/(.*)\/index.js/);
    const pageName = match && match[1];
    entry[pageName] = entryFile;

    return new HtmlWebpackPlugin({
      // template: path.join(__dirname, `src/${pageName}/index.html`),
      template: path.join(__dirname, '../src/index.ejs'),
      filename: `${pageName}.html`,
      chunks: [`${pageName}`],
      inject: true,
      minify: {
        html5: true,
        collapseWhitespace: true,
        preserveLineBreaks: false,
        minifyCSS: true,
        minifyJS: true,
        removeComments: false,
      },
    });
  });

  return {
    entry,
    htmlWebpackPlugins,
  };
};
const { entry, htmlWebpackPlugins } = setMPA();

const getStyleLoaders = (modules) => [
  process.env.NODE_ENV === 'production'
    ? MiniCssExtractPlugin.loader
    : 'style-loader',
  {
    loader: 'css-loader',
    options: {
      modules,
    },
  },
  {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [
          [
            'postcss-preset-env',
            {
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            },
          ],
          // postcssNormalize(),
          useRem
            ? [
                'postcss-pxtorem',
                {
                  rootValue: 75,
                  unitPrecision: 5,
                  propList: ['*'],
                  selectorBlackList: ['.ignore', '.hairlines'],
                  replace: true,
                  mediaQuery: false,
                  minPixelValue: 0,
                  exclude: /node_modules/i,
                },
              ]
            : [
                'postcss-px-to-viewport',
                {
                  // 使用vw自适应
                  unitToConvert: 'px',
                  viewportWidth: 750,
                  unitPrecision: 5,
                  propList: ['*'],
                  viewportUnit: 'vw',
                  fontViewportUnit: 'vw',
                  selectorBlackList: ['.ignore', '.hairlines'],
                  minPixelValue: 1,
                  mediaQuery: false,
                  replace: true,
                  exclude: /(\/|\\)(node_modules)(\/|\\)/,
                  include: undefined,
                  landscape: false,
                  landscapeUnit: 'vw',
                  landscapeWidth: 568,
                },
              ],
        ],
      },
    },
  },
  'sass-loader',
];

module.exports = {
  entry,
  // optimization: {
  //   splitChunks: {
  //     chunks: 'all',
  //   },
  // },
  resolveLoader: {
    modules: ['node_modules', './loader'],
  },
  module: {
    rules: [
      {
        test: /\.(s[ac]ss|css)$/,
        exclude: /\.module\.(s[ac]ss|css)$/,
        use: getStyleLoaders(false),
        sideEffects: true, // 否则会导致css无法import， 因为开启了treeshaking
      },
      {
        test: /\.module\.(s[ac]ss|css)$/,
        use: getStyleLoaders(true),
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
    filename: '[name].[chunkhash].bundle.js',
    path: path.resolve(__dirname, '../dist'),
    // publicPath: "./",
  },
  plugins: [
    new ESLintPlugin({
      extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
    }),
  ].concat(htmlWebpackPlugins),
};
