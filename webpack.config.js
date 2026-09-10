/**
 * webpack.config.js
 *
 * Compiles the Chrome extension's content script and background service worker
 * from TypeScript source into plain JS bundles in public/.
 *
 * Run: npx webpack --mode production
 * Dev:  npx webpack --mode development --watch
 */

const path = require('path');

module.exports = {
  entry: {
    content: './src/content/content.ts',
    background: './src/background/background.ts',
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            // Use a separate tsconfig to avoid CRA's noEmit
            configFile: path.resolve(__dirname, 'tsconfig.webpack.json'),
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  // Do NOT bundle any chrome.* references — they come from the browser at runtime
  externals: {
    'face-api.js': 'faceapi',
    'tesseract.js': 'Tesseract',
  },
  optimization: {
    minimize: false, // Keep readable for debugging; set true for production
  },
  devtool: 'source-map',
};
