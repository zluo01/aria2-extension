const path = require('path');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {
    // Background scripts.
    // 'background/index.js': './background/index.ts',
    // Content scripts.
    // "content/index.js": "./content/index.js"
  },
  output: {
    path: path.resolve(__dirname, 'build/scripts'),
    filename: '[name]',
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
  },
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
    ],
  },
};
