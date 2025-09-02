const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'production',
  entry: { 
    index: {
      import: ['./source/js/globals.js','./source/js/main.js','./source/js/tech_modal.js','./source/optional_modules/zoom_room/index.js']
    }
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].[contenthash].bundle.js',
    clean: true
  },
  optimization: {
    runtimeChunk: 'single'
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