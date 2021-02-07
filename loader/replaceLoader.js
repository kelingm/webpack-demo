const loaderUtils = require('loader-utils');

module.exports = function (source) {
  console.log({ source });
  const options = loaderUtils.getOptions(this);
  return source.replace('good', 'very good');
};
