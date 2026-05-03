import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import webpack from 'webpack';

export default merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',
	devServer: {
		hot: true,
		historyApiFallback: true,
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
	],
});
