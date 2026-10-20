import { expect, mock, test } from 'bun:test';

import { createAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import { updateGraphView } from './updateGraphView';

test('preset changes do not fit or save the previous layout while its replacement is pending', () => {
	const store = createAppStore({ getItem: () => null, removeItem: () => undefined, setItem: () => undefined });
	store.getState().setCamera({ x: 100, y: 200, zoom: 2 });
	store.getState().setAllSettings({ layoutAlgorithm: LayoutAlgorithm.FLAT_RADIAL, showGroupTypes: false });
	const camera = { x: -400, y: -300, zoom: 0.5 };
	const engine = {
		fitView: mock(() => undefined),
		getCamera: () => camera,
		setCamera: mock(() => undefined),
		setData: mock(() => undefined),
	};
	const data = { edges: [], isCalculating: true, nodes: [{ data: {}, id: 'old', position: { x: 0, y: 0 } }] };
	const update = () =>
		updateGraphView({
			data,
			engine,
			isDarkMode: false,
			previousRingWidth: undefined,
			savedCamera: store.getState().camera,
			setCamera: store.getState().setCamera,
			showGroupTypes: false,
		});
	update();
	expect(engine.fitView).not.toHaveBeenCalled();
	expect(engine.setData).not.toHaveBeenCalled();
	expect(store.getState().camera).toBeUndefined();
	data.isCalculating = false;
	data.nodes = [{ data: {}, id: 'new', position: { x: 900, y: 1200 } }];
	update();
	expect(engine.setData).toHaveBeenCalledWith(data.nodes, data.edges, false, false, undefined);
	expect(engine.fitView).toHaveBeenCalledTimes(1);
	expect(store.getState().camera).toEqual(camera);
});

test('completed redraws restore the saved camera instead of fitting again', () => {
	const camera = { x: 100, y: 200, zoom: 2 };
	const engine = {
		fitView: mock(() => undefined),
		getCamera: () => camera,
		setCamera: mock(() => undefined),
		setData: mock(() => undefined),
	};
	const save = mock(() => undefined);
	updateGraphView({
		data: { edges: [], isCalculating: false, nodes: [{ data: {}, id: '1', position: { x: 0, y: 0 } }] },
		engine,
		isDarkMode: true,
		previousRingWidth: undefined,
		savedCamera: camera,
		setCamera: save,
		showGroupTypes: true,
	});
	expect(engine.fitView).not.toHaveBeenCalled();
	expect(engine.setCamera).toHaveBeenCalledWith(camera);
	expect(save).toHaveBeenCalledWith(camera);
});

test('a completed empty news refresh clears the graph without fitting or saving the camera', () => {
	const camera = { x: 10, y: 20, zoom: 2 };
	const engine = {
		fitView: mock(() => undefined),
		getCamera: () => camera,
		setCamera: mock(() => undefined),
		setData: mock(() => undefined),
	};
	const save = mock(() => undefined);
	const options = {
		data: { edges: [], isCalculating: true, nodes: [] },
		engine,
		isDarkMode: false,
		previousRingWidth: 350,
		savedCamera: camera,
		setCamera: save,
		showGroupTypes: true,
	};
	updateGraphView(options);
	expect(engine.setData).not.toHaveBeenCalled();
	options.data.isCalculating = false;
	expect(updateGraphView(options)).toBe(350);
	expect(engine.setData).toHaveBeenCalledWith([], [], true, false, undefined);
	expect(engine.fitView).not.toHaveBeenCalled();
	expect(save).not.toHaveBeenCalled();
});
