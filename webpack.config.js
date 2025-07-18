const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'production',
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
    filename: 'js/[name].[contenthash].bundle.js',
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
      minify: {
        removeComments: false,
        collapseWhitespace: true
      },
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash].css'
    }),
    new WebpackShellPluginNext({
      onBuildEnd:{
        scripts: ['node inject-icons.js'],
        blocking: false,
        parallel: true
      }
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(ttf|woff2?|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]'
        }
      },
      {
        test: /\/optional_modules\/.+\.html$/,
        use: ['html-loader'],
      },
    ]
  },
  optimization: {
    minimizer: [
      '...', // extend existing JS minimizer (TerserPlugin)
      new CssMinimizerPlugin(),
    ]
  },
  devtool: 'source-map'
};