import { test } from 'bun:test';
import assert from 'node:assert/strict';

import { calculateTextOrientation, getTangentialLineDirection } from './sunburstTextOrientation';

const testAngles = [0, 30, 60, 89, 90, 120, 180, 240, 270, 300, 330, 359];

test('keeps radial and tangential text readable for representative angles', () => {
	for (const mode of ['radial', 'tangential'] as const) {
		for (const angle of testAngles) {
			const orientation = calculateTextOrientation(angle, mode);
			assert.equal(orientation.textAnchor, 'middle');
			assert(orientation.rotationDeg >= 0 && orientation.rotationDeg < 360);
			assert(orientation.rotationDeg <= 90 || orientation.rotationDeg >= 270);
		}
	}
});

test('uses the configured tangential line direction at angle boundaries', () => {
	assert.equal(calculateTextOrientation(90, 'radial').flipped, false);
	assert.equal(calculateTextOrientation(93, 'radial').flipped, false);
	assert.equal(calculateTextOrientation(94, 'radial').flipped, true);
	assert.equal(calculateTextOrientation(266, 'radial').flipped, true);
	assert.equal(calculateTextOrientation(267, 'radial').flipped, false);
	assert.equal(calculateTextOrientation(270, 'radial').flipped, false);
	assert.equal(getTangentialLineDirection(0), 'outside-in');
	assert.equal(getTangentialLineDirection(60), 'inside-out');
	assert.equal(getTangentialLineDirection(90), 'outside-in');
	assert.equal(getTangentialLineDirection(120), 'inside-out');
	assert.equal(getTangentialLineDirection(180), 'outside-in');
	assert.equal(getTangentialLineDirection(240), 'outside-in');
	assert.equal(getTangentialLineDirection(270), 'outside-in');
});
