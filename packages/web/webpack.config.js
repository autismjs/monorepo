const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { compilerOptions } = require('./tsconfig.json');

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
  VERBOSE: '',
});

const rules = [
  {
    test: /\.(s[ac]ss|css)$/i,
    use: [
      // Creates `style` nodes from JS strings
      // 'style-loader',
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
      app: path.join(__dirname, 'src', 'index.ts'),
    },
    // externals: {
    //   'multicast-dns': 'commonjs2 multicast-dns',
    // },
    resolve: {
      alias: {
        '@message': path.join(__dirname, '..', 'message', 'src'),
        '@crypto': path.join(__dirname, '..', 'crypto', 'src'),
        '@db': path.join(__dirname, '..', 'db', 'src'),
        '@protocol': path.join(__dirname, '..', 'protocol', 'src'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      // modules: [
      //   path.resolve('./node_modules'),
      //   path.resolve(__dirname, compilerOptions.baseUrl),
      // ],
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        console: require.resolve('console-browserify'),
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
        readline: false,
        // buffer: require.resolve('buffer/'),
        // process: require.resolve('process/browser.ts'),
        events: require.resolve('events/'),
      },
    },
    node: {
      __dirname: true,
    },
    module: {
      rules: [...rules],
    },
    output: {
      path: __dirname + '/build',
      publicPath: isProd ? '/' : 'http://localhost:8080/',
      filename: `[name].js`,
      globalObject: 'this',
    },
    plugins: [
      envPlugin,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
      new CopyPlugin({
        patterns: [{ from: './lib/style.css', to: './' }],
      }),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'static', 'index.html'),
        filename: 'index.html',
        chunks: ['index'],
        cache: false,
        inject: true,
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
