// eslint-disable-next-line unicorn/prefer-module
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = () => {
	return {
		webpack: {
			configure: (webpackConfig, { env }) => {
				if (env !== 'development') {
					const htmlWebpackPluginInstanceIndex = webpackConfig.plugins.findIndex(webpackPlugin => webpackPlugin instanceof HtmlWebpackPlugin)

					if (htmlWebpackPluginInstanceIndex !== -1) {
						webpackConfig.plugins[htmlWebpackPluginInstanceIndex] = new HtmlWebpackPlugin({
							inject: 'body',
							template: './public/index.html',
						})
					}
				}

				webpackConfig.experiments = {
					...webpackConfig.experiments,
					topLevelAwait: true,
				};

				webpackConfig.output = {
					...webpackConfig.output,
					filename: 'static/js/[name].js',
					chunkFilename: 'static/js/[name].chunk.js',
				}

				return webpackConfig;
			},
		},
	};
};