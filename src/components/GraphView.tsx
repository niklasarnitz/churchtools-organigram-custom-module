import React from 'react';

import { WebGLGraphView } from './WebGLRenderer/WebGLGraphView';

export const GraphView = React.memo(() => {
	return <WebGLGraphView />;
});
