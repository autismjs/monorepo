const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

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
    target: 'node',
    mode: isProd ? 'production' : 'development',
    entry: {
      start: path.join(__dirname, 'scripts', 'start.ts'),
    },
    resolve: {
      alias: {
        '@message': path.join(__dirname, '..', 'message', 'src'),
        '@crypto': path.join(__dirname, '..', 'crypto', 'src'),
        '@db': path.join(__dirname, '..', 'db', 'src'),
        '@protocol': path.join(__dirname, '..', 'protocol', 'src'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg', '.node'],
    },
    // externals: [nodeExternals()],
    node: {
      __dirname: true,
    },
    module: {
      rules: [...rules],
    },
    output: {
      path: __dirname + '/build',
      publicPath: '/',
      filename: `[name].js`,
    },
    plugins: [envPlugin],
    stats: 'minimal',
  },
];
