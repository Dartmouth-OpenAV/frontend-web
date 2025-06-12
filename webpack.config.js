const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'production',
  entry: {
    index: ['./source/js/main.js']
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].[contenthash].bundle.js',
    clean: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'source/index.html',
      favicon: 'source/favicon.svg',
      minify: {
        removeComments: false,
      },
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
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]'
        }
      },
    ]
  },
  optimization: {
    minimizer: [new CssMinimizerPlugin(),]
  },
  devtool: 'source-map',
};