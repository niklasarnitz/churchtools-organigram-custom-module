import React from 'react';

import { WebGLGraphView } from './WebGLRenderer/WebGLGraphView';

export const GraphView = React.memo(({ isLoading }: { isLoading: boolean }) => {
	return <WebGLGraphView isLoading={isLoading} />;
});
