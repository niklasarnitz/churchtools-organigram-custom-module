import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { usePresets } from './useUserSettings';

test('presets use German alphabetical and natural number order without reordering stored data', () => {
	const client = new QueryClient();
	const presets = ['Team 10', 'Öffentlich', 'Team 2', 'Älteste'].map((name) => ({ name, settings: {} }));
	client.setQueryData(['presets'], { presets });
	const Names = () => (
		<span>
			{usePresets()
				.presets.map(({ name }) => name)
				.join(', ')}
		</span>
	);
	expect(
		renderToStaticMarkup(
			<QueryClientProvider client={client}>
				<Names />
			</QueryClientProvider>,
		),
	).toBe('<span>Älteste, Öffentlich, Team 2, Team 10</span>');
	expect(client.getQueryData<{ presets: typeof presets }>(['presets'])).toEqual({ presets });
	client.clear();
});
