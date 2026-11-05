import { expect, mock, test } from 'bun:test';

import { createAppStore } from '../../state/useAppStore';
import { LayoutAlgorithm } from '../../types/LayoutAlgorithm';
import { updateGraphView } from './updateGraphView';

test('preset changes fit the completed layout despite camera input while its replacement is pending', () => {
	const store = createAppStore({ getItem: () => null, removeItem: () => undefined, setItem: () => undefined });
	store.getState().setCamera({ x: 100, y: 200, zoom: 2 });
	store.getState().setAllSettings({ layoutAlgorithm: LayoutAlgorithm.FLAT_RADIAL, showGroupTypes: false });
	const camera = { x: -400, y: -300, zoom: 0.5 };
	let renderedCamera = { x: 120, y: 240, zoom: 2.2 };
	const engine = {
		fitView: mock(() => {
			renderedCamera = camera;
		}),
		getCamera: () => renderedCamera,
		setCamera: mock((next: typeof camera) => {
			renderedCamera = next;
		}),
		setData: mock(() => undefined),
	};
	const data = { edges: [], isCalculating: true, nodes: [{ data: {}, id: 'old', position: { x: 0, y: 0 } }] };
	const update = () =>
		updateGraphView({
			data,
			engine,
			fitViewRequested: store.getState().presetFitPending,
			isDarkMode: false,
			previousRingWidth: undefined,
			savedCamera: store.getState().camera,
			setCamera: store.getState().completeViewUpdate,
			showGroupTypes: false,
		});
	update();
	expect(engine.fitView).not.toHaveBeenCalled();
	expect(engine.setData).not.toHaveBeenCalled();
	expect(store.getState().camera).toBeUndefined();
	// A wheel or pan handler can save the old layout's camera before the new layout finishes.
	store.getState().setCamera(renderedCamera);
	data.isCalculating = false;
	data.nodes = [{ data: {}, id: 'new', position: { x: 900, y: 1200 } }];
	update();
	expect(store.getState().camera).toEqual(camera);
	expect(engine.setData).toHaveBeenCalledWith(data.nodes, data.edges, false, false, undefined);
	expect(engine.fitView).toHaveBeenCalledTimes(1);
	// Once the completed diagram is fitted, subsequent user navigation must be retained.
	const navigatedCamera = { x: 55, y: -75, zoom: 1.3 };
	store.getState().setCamera(navigatedCamera);
	update();
	expect(store.getState().camera).toEqual(navigatedCamera);
	expect(engine.getCamera()).toEqual(navigatedCamera);
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
		fitViewRequested: false,
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
