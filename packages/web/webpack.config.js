const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
          mozjpeg: {
            progressive: true,
          },
          // optipng.enabled: false will disable optipng
          optipng: {
            enabled: true,
          },
          svgo: {
            enabled: true,
          },
          pngquant: {
            quality: [0.65, 0.9],
            speed: 4,
          },
          gifsicle: {
            interlaced: false,
          },
          // the webp option will enable WEBP
          webp: {
            quality: 75,
          },
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
    ignoreWarnings: [/Uncaught \(in promise\) CodeError: stream reset/],
    entry: {
      app: path.join(__dirname, 'src', 'index.ts'),
    },

    resolve: {
      alias: {
        '@message': path.join(__dirname, '..', 'message', 'src'),
        '@crypto': path.join(__dirname, '..', 'crypto', 'src'),
        '@db': path.join(__dirname, '..', 'db', 'src'),
        '@protocol': path.join(__dirname, '..', 'protocol', 'src'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],

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
      publicPath: '/',
      filename: isProd ? '[chunkhash].js' : `[name].bundle.[chunkhash].js`,
      globalObject: 'this',
    },
    plugins: [
      new CleanWebpackPlugin({ verbose: false }),
      new webpack.ProgressPlugin(),
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
        // chunks: ['index'],
        cache: true,
        inject: true,
        scriptLoading: 'defer',
        publicPath: 'auto',
      }),
    ],
    stats: 'minimal',
    infrastructureLogging: {
      level: 'error',
    },
    optimization: {
      moduleIds: 'deterministic',
      minimize: process.env.NODE_ENV !== 'development',
      minimizer:
        process.env.NODE_ENV !== 'development'
          ? [
              new TerserPlugin({
                extractComments: false,
              }),
            ]
          : [],
      // runtimeChunk: 'single',
      // splitChunks: {
      //   chunks: 'all',
      // },
    },
    devtool:
      process.env.NODE_ENV === 'development'
        ? 'cheap-module-source-map'
        : false,
    devServer: {
      port: 3000,
      historyApiFallback: true,
      hot: true,
    },
  },
];
