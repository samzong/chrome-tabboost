const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  devtool: "cheap-module-source-map",
  entry: {
    popup: "./src/popup/popup.js",
    options: "./src/options/options.js",
    background: "./src/js/background.js",
    contentScript: "./src/js/contentScript.js",
    storageCache: "./src/utils/storage-cache.js",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].js",
    clean: true,
  },
  devServer: {
    static: path.join(__dirname, "build"),
    port: 3000,
    open: true,
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/popup/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
      templateParameters: {
        cssPath: "./assets/styles/popup.css",
      },
    }),
    new HtmlWebpackPlugin({
      template: "./src/options/options.html",
      filename: "options.html",
      chunks: ["options"],
      templateParameters: {
        cssPath: "./assets/styles/options.css",
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./manifest.json",
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content.toString());

            if (manifest.action && manifest.action.default_icon) {
              manifest.action.default_icon = {
                16: "assets/icons/icon16.png",
                48: "assets/icons/icon48.png",
                128: "assets/icons/icon128.png",
              };
            }

            if (manifest.icons) {
              manifest.icons = {
                16: "assets/icons/icon16.png",
                48: "assets/icons/icon48.png",
                128: "assets/icons/icon128.png",
              };
            }

            if (manifest.content_scripts && manifest.content_scripts.length > 0) {
              manifest.content_scripts[0].js = ["contentScript.js"];
              manifest.content_scripts[0].css = [
                "assets/styles/popupStyles.css",
                "assets/styles/popupNotificationStyles.css",
                "assets/styles/splitViewStyles.css",
              ];
            }

            if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
              manifest.web_accessible_resources[0].resources = [
                "assets/styles/splitViewStyles.css",
              ];
            }

            if (manifest.background) {
              manifest.background.service_worker = "background.js";
            }

            if (manifest.options_page) {
              manifest.options_page = "options.html";
            }

            if (manifest.action && manifest.action.default_popup) {
              manifest.action.default_popup = "popup.html";
            }

            return Buffer.from(JSON.stringify(manifest, null, 2));
          },
        },
        {
          from: "src/styles",
          to: "assets/styles",
          noErrorOnMissing: true,
        },
        {
          from: "src/assets",
          to: "assets",
          noErrorOnMissing: true,
        },
        {
          from: "src/_locales",
          to: "_locales",
          noErrorOnMissing: true,
        },
        {
          from: "rules",
          to: "rules",
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  optimization: {
    moduleIds: "deterministic",
  },
};
