const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // Set mode to development by default or use NODE_ENV
  mode: process.env.NODE_ENV || 'development',
  // Entry point of the application; adjust this path if necessary
  entry: {
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
    background: './src/js/background.js'
  },
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean the output directory before each build
  },
  // Development server configuration
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3000,
    open: true,
    hot: true,
  },
  // Module rules to handle different file types
  module: {
    rules: [
      {
        // Transpile modern JavaScript to older versions using babel-loader
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        // Process CSS files with appropriate loaders
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ],
  },
  // Plugins configuration
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options.html',
      chunks: ['options']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: './manifest.json',
          to: 'manifest.json',
          transform(content) {
            // 如果需要在构建时修改 manifest
            return Buffer.from(JSON.stringify({
              ...JSON.parse(content.toString()),
              version: process.env.npm_package_version || '1.0.0'
            }, null, 2))
          }
        },
        { 
          from: 'src/assets',
          to: 'assets',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  optimization: {
    moduleIds: 'deterministic'
  },
}; 