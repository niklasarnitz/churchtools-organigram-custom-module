/** Bound both URL size and concurrent work, including on installations with thousands of groups. */
export async function fetchInBatches<T>(ids: number[], fetchBatch: (batch: number[]) => Promise<T[]>): Promise<T[]> {
	const batchSize = 100;
	const concurrency = 4;
	const results: T[][] = [];
	let nextIndex = 0;
	await Promise.all(
		Array.from({ length: Math.min(concurrency, Math.ceil(ids.length / batchSize)) }, async () => {
			while (nextIndex < ids.length) {
				const index = nextIndex;
				nextIndex += batchSize;
				results[index / batchSize] = await fetchBatch(ids.slice(index, index + batchSize));
			}
		}),
	);
	return results.flat();
}
