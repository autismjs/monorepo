const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
const HtmlWebpackPlugin = require("html-webpack-plugin");
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
    target: "web",
    mode: isProd ? 'production' : 'development',
    entry: {
      app: path.join(__dirname, 'src', 'index.ts'),
    },
    // externalsPresets: { node: true },
    // externals: {
    //   snarkjs: 'commonjs2 snarkjs',
    //   // snarkjs: require.resolve('snarkjs'),
    //   // 'node:crypto': require.resolve('crypto-browserify'),
    //   // '@autismjs/crypto': 'commonjs2 @autismjs/crypto',
    //   // 'multicast-dns': 'commonjs2 multicast-dns',
    //   // '@zk-kit/protocols': 'commonjs2 @zk-kit/protocols',
    // },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      modules: [
        path.resolve('./node_modules'),
        path.resolve(__dirname, compilerOptions.baseUrl),
      ],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        os: require.resolve('os-browserify/browser'),
        stream: require.resolve('stream-browserify'),
        assert: require.resolve('assert'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        path: require.resolve('path-browserify'),
        vm: require.resolve('vm-browserify'),
        constants: require.resolve('constants-browserify'),
        fs: false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        events: require.resolve("events/"),
        // "util": require.resolve("util/"),
        // "worker_threads": false,
        // readline: false,
      },
    },
    // node: {
    //   __dirname: true,
    // },
    module: {
      rules: [...rules],
    },
    output: {
      path: __dirname + '/build',
      // publicPath: isProd ? '/' : 'http://localhost:8080/',
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
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "static", "index.html"),
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
