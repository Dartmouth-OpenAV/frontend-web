const path = require('path');

module.exports = {
  mode: 'development',
  entry: './source/js/main.js',
  output: {
    path: path.resolve(__dirname, 'public/js'),
    filename: 'index.js'
  }
};