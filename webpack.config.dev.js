const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

module.exports = {
  mode: 'development',
  entry: { 
    index: {
      import: ['./source/js/globals.js','./source/js/main.js','./source/js/tech_modal.js','./source/optional_modules/zoom_room/index.js','./source/optional_modules/camera_integration/index.js']
    }
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'js/[name].bundle.js',
    clean: true
  },
  optimization: {
    runtimeChunk: 'single'
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