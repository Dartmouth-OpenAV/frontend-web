const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'development',
  // context: path.resolve(__dirname, 'source'),
  entry: { 
    globals: './source/js/globals.js',
    index: {
      import: './source/js/main.js',
      dependOn: 'globals', 
    },
    zoom: {
      import: './source/optional_modules/zoom_room/index.js',
      dependOn: 'globals',
    }
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].bundle.js',
    clean: true
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'common',
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'source/index.html',
      favicon: 'source/favicon.svg',
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    }),
    new WebpackShellPluginNext({
      onBuildEnd:{
        scripts: ['node inject-icons.js'],
        blocking: false,
        parallel: true
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ MiniCssExtractPlugin.loader, 'css-loader' ]
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]'
        }
      },
      {
        test: /\/optional_modules\/.+\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: false,      // Disable HTML minimization so comments stay
            }
          }
        ],
      },
    ]
  },
};