/* eslint-disable */
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const { merge } = require("webpack-merge");
const path = require("path");
const dotenv = require("dotenv").config({ path: `${__dirname}/.env` });
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const threadLoader = require("thread-loader");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const MomentTimezoneDataPlugin = require("moment-timezone-data-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const parts = require("./webpack.parts");
const DEVELOPMENT = "development";
const PRODUCTION = "production";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3000;
const ASSET_PATH = process.env.ASSET_PATH || "/";
const BUILD_DIR = process.env.BUILD_DIR || "build";
const smp = new SpeedMeasurePlugin({
  disable: !process.env.MEASURE_SPEED,
});

const PATHS = {
  src: path.join(__dirname, "src"),
  entry: path.join(__dirname, "src", "index.js"),
  public: path.join(__dirname, "public"),
  template: path.join(__dirname, "public", "index.html"),
  build: path.join(__dirname, BUILD_DIR),
  node_modules: path.join(__dirname, "node_modules"),
  vendor: path.join(__dirname, "vendor"),
  commonPackage: path.join(__dirname, "common"),
  sharedPackage: path.join(__dirname, "..", "common", "src"),
};

const BUILD_FILE_NAMES = {
  css: "style/[name].[contenthash:8].css",
  cssChunkName: "style/[name].[chunkhash:8].css",
  bundle: "js/bundle.[chunkhash:4].js",
  vendor: "js/[id].[chunkhash:4].js",
  assets: "assets/[name].[hash:4].[ext]",
};

const PATH_ALIASES = {
  "@": PATHS.src,
  vendor: PATHS.vendor,
  "@common": PATHS.commonPackage,
  "@mds/common": `${PATHS.sharedPackage}`,
};

const envFile: any = {};
// @ts-ignore
envFile.BASE_PATH = JSON.stringify("");
// Populate the env dict with Environment variables from the system
if (process.env) {
  Object.keys(process.env).map((key) => {
    envFile[key] = JSON.stringify(process.env[key]);
  });
  // Update the env dict with any in the .env file
}
if (dotenv.parsed) {
  Object.keys(dotenv.parsed).map((key) => {
    envFile[key] = JSON.stringify(dotenv.parsed[key]);
  });
}

const commonConfig = merge([
  {
    devtool: "inline-source-map",
    entry: {
      main: PATHS.entry,
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(PATHS.public, "custom-script.js"),
            to: path.join(PATHS.build, "custom-script.js"),
          },
        ],
      }),
      //new webpack.optimize.ModuleConcatenationPlugin(),
      new HtmlWebpackPlugin({
        template: PATHS.template,
      }),
      new webpack.ProvidePlugin({
        REQUEST_HEADER: path.resolve(__dirname, "common/utils/RequestHeaders.js"),
        GLOBAL_ROUTES: path.resolve(__dirname, "src/constants/routes.ts"),
      }),
      // // Prevent moment locales to be bundled with the app
      // // to reduce app size
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      // Explicitly load timezone data for Canada and US
      new MomentTimezoneDataPlugin({
        startYear: 1900,
        endYear: 2300,
        matchZones: /^(America.*|Canada.*)/,
      }),
      new MiniCssExtractPlugin(),
    ],
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        ...PATH_ALIASES,
        ...(process.env.NODE_ENV === "development"
          ? {
            "react-dom": "@hot-loader/react-dom",
          }
          : {}),
        // Use lodash-es that supports proper tree-shaking
        lodash: "lodash-es",
      },
    },
  },
  parts.setEnvironmentVariable(envFile),
  parts.loadJS({
    include: [PATHS.src, PATHS.commonPackage, PATHS.sharedPackage],
  }),
  parts.loadFonts({
    exclude: path.join(PATHS.src, "assets", "images"),
    options: {
      name: BUILD_FILE_NAMES.assets,
    },
  }),
  parts.loadFiles({
    include: [
      path.join(PATHS.src, "assets", "downloads"),
      path.join(PATHS.sharedPackage, "assets", "downloads"),
    ],
  }),
]);

const devConfig = merge([
  {
    plugins: [new ForkTsCheckerWebpackPlugin()],
  },
  {
    output: {
      path: PATHS.build,
      publicPath: ASSET_PATH,
      filename: "bundle.js",
    },
  },
  parts.generateSourceMaps({
    type: "eval-source-map",
  }),
  parts.devServer({
    host: HOST,
    port: PORT,
  }),
  parts.loadCSS({
    theme: path.join(PATHS.src, "styles", "settings", "theme.scss"),
  }),
  parts.loadImages({
    exclude: path.join(PATHS.src, "assets", "fonts"),
  }),
  {
    watchOptions: {
      // Increase file change poll interval to reduce
      // CPU usage on some operating systems.
      poll: 2500,
      ignored: /node_modules/,
    },
  },
]);

const prodConfig = merge([
  {
    output: {
      path: PATHS.build,
      publicPath: ASSET_PATH,
      chunkFilename: BUILD_FILE_NAMES.vendor,
      filename: BUILD_FILE_NAMES.bundle,
    },
  },
  parts.clean(),
  parts.generateSourceMaps({
    type: "source-map",
  }),
  parts.extractCSS({
    filename: BUILD_FILE_NAMES.css,
    chunkFilename: BUILD_FILE_NAMES.cssChunkName,
    theme: path.join(PATHS.src, "styles", "settings", "theme.scss"),
  }),
  parts.loadImages({
    exclude: path.join(PATHS.src, "assets", "fonts"),
    urlLoaderOptions: {
      limit: 10 * 1024,
      name: BUILD_FILE_NAMES.assets,
    },
    fileLoaderOptions: {
      name: BUILD_FILE_NAMES.assets,
    },
  }),
  parts.bundleOptimization({
    options: {
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/](?!\@syncfusion*)/,
          name: "vendor",
          chunks: "all",
          priority: -5,
        },
        syncfusion: {
          test: /[\\/]node_modules\/\@syncfusion*/,
          name: "syncfusion",
          chunks: "all",
          priority: 10,
        },
        leaflet: {
          test: /[\\/]node_modules\/leaflet*/,
          name: "leaflet",
          chunks: "all",
          priority: 10,
        },
      },
    },
    cssOptions: {
      zindex: false,
      discardComments: {
        removeAll: true,
      },
    },
  }),
  parts.extractManifest(),
  parts.copy(PATHS.public, path.join(PATHS.build, "public")),
  {
    plugins: [
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        generateStatsFile: true,
        statsOptions: { source: false },
      }),
    ],
  },
]);

module.exports = () => {
  const mode = process.env.NODE_ENV || "production";
  if (mode === PRODUCTION) {
    return merge(commonConfig, prodConfig, { mode });
  }

  if (mode === DEVELOPMENT) {
    const conf = merge(commonConfig, devConfig, { mode });

    return process.env.MEASURE_SPEED ? smp.wrap(conf) : conf;
  }
};
