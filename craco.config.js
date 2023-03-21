module.exports = {
	webpack: {
		configure: {
			experiments: {
				topLevelAwait: true,
			},
			output: {
				filename: 'static/js/[name].js',
				chunkFilename: 'static/js/[name].chunk.js'
			},
		},
	},
};