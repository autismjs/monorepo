const webpack = require('webpack');
// const BundleAnalyzerPlugin =
//   require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
});

const rules = [
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
    mode: isProd ? 'production' : 'development',
    entry: {
      browser: path.join(__dirname, 'src', 'start.ts'),
    },
    target: 'web',
    devtool: 'source-map',
    externals: {
      snarkjs: 'commonjs2 snarkjs',
      // 'node:crypto': require.resolve('crypto-browserify'),
      // '@zk-kit/protocols': 'commonjs2 @zk-kit/protocols',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        os: require.resolve('os-browserify/browser.ts'),
        stream: require.resolve('stream-browserify'),
        assert: require.resolve('assert'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        constants: require.resolve('constants-browserify'),
        fs: false,
        path: false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser.ts'),
        // worker_threads: false,
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
      filename: `[name].js`,
      libraryTarget: 'umd',
      globalObject: 'this',
      umdNamedDefine: true,
    },
    plugins: [
      envPlugin,
      // new BundleAnalyzerPlugin(),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
    ],
  },
];
