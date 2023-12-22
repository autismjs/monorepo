const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const CopyPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const { compilerOptions } = require('./tsconfig.json');

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
});

const rules = [
  {
    test: /\.(s[ac]ss|css)$/i,
    use: [
      // Creates `style` nodes from JS strings
      'style-loader',
      // Translates CSS into CommonJS
      'css-loader',
      // Compiles Sass to CSS
      'sass-loader',
    ],
  },
  {
    test: /\.(gif|png|jpe?g|svg)$/i,
    use: [
      'file-loader',
      {
        loader: 'image-webpack-loader',
        options: {
          publicPath: 'assets',
          bypassOnDebug: true, // webpack@1.x
          disable: true, // webpack@2.x and newer
        },
      },
    ],
  },
  {
    test: /\.tsx?$/,
    exclude: [/(node_modules|.webpack)/],
    rules: [
      {
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json',
          transpileOnly: true,
        },
      },
    ],
  },
  {
    test: /\.node$/,
    use: 'node-loader',
  },
];

module.exports = [
  {
    target: 'web',
    mode: isProd ? 'production' : 'development',
    entry: {
      app: path.join(__dirname, 'dev', 'start.ts'),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
    },
    module: {
      rules: [...rules],
    },
    output: {
      path: __dirname + '/scripts-build',
      publicPath: isProd ? '/' : 'http://localhost:8080/',
      filename: `[name].js`,
    },
    plugins: [
      envPlugin,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
      // new CopyPlugin({
      //   patterns: [
      //     { from: "./node_modules/@autismjs/protocol/build", to: "./"}
      //   ]
      // }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "dev", "index.html"),
        filename: "index.html",
        chunks: ["index"],
        cache: false,
        inject: true
      }),
    ],
    stats: 'minimal',
    // devServer: {
    //   historyApiFallback: true,
    //   proxy: {
    //     '/rest': {
    //       target: `http://127.0.0.1:8080`,
    //       secure: true,
    //     },
    //   },
    // },
  },
];
