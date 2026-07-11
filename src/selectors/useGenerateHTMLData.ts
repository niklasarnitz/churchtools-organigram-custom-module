import { useCallback } from 'react';

import { useGenerateSVGData } from './useGenerateSVGData';

export const useGenerateHTMLData = () => {
	const generateSVGData = useGenerateSVGData();

	return useCallback(() => {
		const svg = generateSVGData().replace(/^<\?xml[^>]*>\s*/, '');
		return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Organigramm</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f8fafc; color: #0f172a; font-family: Lato, system-ui, sans-serif; }
    main { min-height: 100vh; padding: 24px; display: grid; place-items: center; }
    svg { width: min(100%, 1600px); height: auto; max-height: calc(100vh - 48px); filter: drop-shadow(0 10px 20px rgb(15 23 42 / 0.08)); }
  </style>
</head>
<body>
  <main>
${svg}
  </main>
</body>
</html>`;
	}, [generateSVGData]);
};
