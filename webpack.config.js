const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // Set mode to development by default or use NODE_ENV
  mode: process.env.NODE_ENV || 'development',
  // Add devtool setting
  devtool: 'cheap-module-source-map', // Recommended for development to avoid 'eval'
  // Entry point of the application; adjust this path if necessary
  entry: {
    popup: './src/popup/popup.js',
    options: './src/options/options.js',
    background: './src/js/background.js',
    contentScript: './src/js/contentScript.js',  // 添加 content script 入口
    storageCache: './src/utils/storage-cache.js', // 添加存储缓存入口
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
      chunks: ['popup'],
      templateParameters: {
        cssPath: './assets/styles/popup.css'
      }
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options.html',
      chunks: ['options'],
      templateParameters: {
        cssPath: './assets/styles/options.css'
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: './manifest.json',
          to: 'manifest.json',
          transform(content) {
            // 修改 manifest.json 中的路径
            const manifest = JSON.parse(content.toString());
            
            // 修正 action 中的图标路径
            if (manifest.action && manifest.action.default_icon) {
              manifest.action.default_icon = {
                "16": "assets/icons/icon16.png",
                "48": "assets/icons/icon48.png",
                "128": "assets/icons/icon128.png"
              };
            }
            
            // 修正 icons 路径
            if (manifest.icons) {
              manifest.icons = {
                "16": "assets/icons/icon16.png",
                "48": "assets/icons/icon48.png",
                "128": "assets/icons/icon128.png"
              };
            }
            
            // 修正 content_scripts 路径
            if (manifest.content_scripts && manifest.content_scripts.length > 0) {
              manifest.content_scripts[0].js = ["contentScript.js"];
              manifest.content_scripts[0].css = ["assets/styles/popupStyles.css", "assets/styles/splitViewStyles.css"];
            }
            
            // 修正 web_accessible_resources 路径
            if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
              manifest.web_accessible_resources[0].resources = ["assets/styles/splitViewStyles.css"];
            }
            
            // 修正 background 路径
            if (manifest.background) {
              manifest.background.service_worker = "background.js";
            }
            
            // 修正 options_page 路径
            if (manifest.options_page) {
              manifest.options_page = "options.html";
            }
            
            // 修正 action 中的 default_popup 路径
            if (manifest.action && manifest.action.default_popup) {
              manifest.action.default_popup = "popup.html";
            }
            
            return Buffer.from(JSON.stringify(manifest, null, 2));
          }
        },
        // 复制 CSS 文件到 assets 目录
        { 
          from: 'src/styles',
          to: 'assets/styles',
          noErrorOnMissing: true
        },
        { 
          from: 'src/assets',
          to: 'assets',
          noErrorOnMissing: true
        },
        // 复制 _locales 目录
        {
          from: '_locales',
          to: '_locales',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  optimization: {
    moduleIds: 'deterministic'
  },
}; 