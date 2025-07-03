import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import checkNodeEnv from '../scripts/check-node-env';

if (process.env.NODE_ENV === 'production') {
  checkNodeEnv('development');
}

const configuration: webpack.Configuration = {
  devtool: 'inline-source-map',
  mode: 'development',
  target: 'electron-preload',
  entry: path.join(webpackPaths.srcMainPath, 'preloads', 'extension-preload.ts'),
  output: {
    path: webpackPaths.dllPath,
    filename: 'extension-preload.js',
    library: {
      type: 'umd',
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
  watch: true,
};

export default merge(baseConfig, configuration);
