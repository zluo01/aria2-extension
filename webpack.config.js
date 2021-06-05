const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {
    // Background scripts.
    'background/index.js': './background/index.ts',
    // Content scripts.
    // "content/index.js": "./content/index.js"
    // Download Panel Scripts
    'panel/index.js': './components/panel/index.tsx',
    'settings/index.js': './settings/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'build/target'),
    filename: '[name]',
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'download.html',
      template: './components/panel/index.html',
      chunks: ['panel/index.js'],
    }),
    new HtmlWebpackPlugin({
      filename: 'settings/index.html',
      template: './settings/index.html',
      chunks: ['settings/index.js'],
    }),
  ],
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            noEmit: false,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
