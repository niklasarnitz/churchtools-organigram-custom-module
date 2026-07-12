import assert from 'node:assert/strict';

import { calculateTextOrientation } from '../src/helpers/sunburstTextOrientation';

const testAngles = [0, 30, 60, 89, 90, 120, 180, 240, 270, 300, 330, 359];

for (const mode of ['radial', 'tangential'] as const) {
	for (const angle of testAngles) {
		const orientation = calculateTextOrientation(angle, mode);
		assert.equal(orientation.textAnchor, 'middle');
		assert(orientation.rotationDeg >= 0 && orientation.rotationDeg < 360);
		assert(orientation.rotationDeg <= 90 || orientation.rotationDeg >= 270);
	}
}

assert.equal(calculateTextOrientation(90, 'radial').flipped, false);
assert.equal(calculateTextOrientation(93, 'radial').flipped, false);
assert.equal(calculateTextOrientation(94, 'radial').flipped, true);
assert.equal(calculateTextOrientation(266, 'radial').flipped, true);
assert.equal(calculateTextOrientation(267, 'radial').flipped, false);
assert.equal(calculateTextOrientation(270, 'radial').flipped, false);

// eslint-disable-next-line no-console
console.log(`Sunburst text orientation tests passed for ${String(testAngles.length)} angles in both modes.`);
