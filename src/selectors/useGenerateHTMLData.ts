import { useCallback } from 'react';

import type { PreviewGraphNodeData } from '../types/GraphNode';

import { useAppStore } from '../state/useAppStore';
import { useGenerateReflowData } from './useGenerateReflowData';
import { useGenerateSVGData } from './useGenerateSVGData';

export const useGenerateHTMLData = () => {
	const data = useGenerateReflowData();
	const baseUrl = useAppStore((s) => s.baseUrl);
	const generateSVGData = useGenerateSVGData();

	return useCallback(() => {
		const svg = generateSVGData().replace(/^<\?xml[^>]*>\s*/, '');
		const interactionMetaByNodeId: Record<string, ExportInteractionMeta> = data.sunburstRenderData
			? Object.fromEntries(
					Object.entries(data.sunburstRenderData.interactionByNodeId).map(([nodeId, meta]) => [
						nodeId,
						{
							alternateParentTitles: meta.alternateParentTitles,
							groupUrl: createGroupUrl(baseUrl, meta.nodeId),
							pathTitles: meta.pathTitles,
							primaryParentSource: meta.primaryParentSource,
							title: meta.title,
						},
					]),
				)
			: Object.fromEntries(
					data.nodes.map((node) => {
						const nodeData = node.data as PreviewGraphNodeData;
						return [
							node.id,
							{
								groupTypeName: nodeData.groupTypeName,
								groupUrl: createGroupUrl(baseUrl, nodeData.id),
								metadataLines: nodeData.metadata
									.split('\n')
									.map((line: string) => line.trim())
									.filter(Boolean),
								title: nodeData.title,
							},
						];
					}),
				);
		const interactionMetaJson = JSON.stringify(interactionMetaByNodeId)
			.replace(/</g, '\\u003c')
			.replace(/>/g, '\\u003e')
			.replace(/&/g, '\\u0026');

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
    svg text, svg tspan { pointer-events: none; user-select: none; }
    .export-node { cursor: pointer; }
    .export-tooltip {
      position: fixed;
      z-index: 1000;
      display: none;
      max-width: 24rem;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      background: rgb(255 255 255 / 0.96);
      color: #334155;
      padding: 12px 14px;
      box-shadow: 0 20px 45px rgb(15 23 42 / 0.18);
      backdrop-filter: blur(12px);
      font-size: 12px;
      line-height: 1.45;
    }
    .export-tooltip.is-visible { display: block; }
    .export-tooltip__title { font-weight: 700; font-size: 13px; color: #0f172a; }
    .export-tooltip__line + .export-tooltip__line { margin-top: 4px; }
    .export-tooltip__muted { color: #64748b; }
    .export-tooltip__link {
      display: inline-flex;
      margin-top: 8px;
      color: #0f766e;
      text-decoration: none;
      font-weight: 600;
    }
    .export-tooltip__link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
${svg}
  </main>
  <div aria-hidden="true" class="export-tooltip" id="export-tooltip"></div>
  <script>
    const interactionMetaByNodeId = ${interactionMetaJson};
    const tooltip = document.getElementById('export-tooltip');
    const tooltipOffset = 14;

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderTooltip(meta) {
      const lines = [\`<div class="export-tooltip__title">\${escapeHtml(meta.title)}</div>\`];

      if (Array.isArray(meta.pathTitles) && meta.pathTitles.length > 0) {
        lines.push(\`<div class="export-tooltip__line">\${escapeHtml(meta.pathTitles.join(' -> '))}</div>\`);
      }

      if (meta.primaryParentSource) {
        lines.push(\`<div class="export-tooltip__line export-tooltip__muted">Primärobergruppe: \${meta.primaryParentSource === 'churchtools-field' ? 'Feld' : meta.primaryParentSource === 'root' ? 'Wurzel' : 'Fallback'}</div>\`);
      }

      if (Array.isArray(meta.alternateParentTitles) && meta.alternateParentTitles.length > 0) {
        lines.push(\`<div class="export-tooltip__line export-tooltip__muted">Weitere Obergruppen: \${escapeHtml(meta.alternateParentTitles.join(', '))}</div>\`);
      }

      if (meta.groupTypeName) {
        lines.push(\`<div class="export-tooltip__line export-tooltip__muted">Typ: \${escapeHtml(meta.groupTypeName)}</div>\`);
      }

      if (Array.isArray(meta.metadataLines) && meta.metadataLines.length > 0) {
        for (const line of meta.metadataLines) {
          lines.push(\`<div class="export-tooltip__line export-tooltip__muted">\${escapeHtml(line)}</div>\`);
        }
      }

      if (meta.groupUrl) {
        lines.push(\`<a class="export-tooltip__link" href="\${escapeHtml(meta.groupUrl)}" rel="noopener noreferrer" target="_blank">Gruppe in ChurchTools öffnen</a>\`);
      }

      tooltip.innerHTML = lines.join('');
    }

    function placeTooltip(clientX, clientY) {
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      tooltip.classList.add('is-visible');

      const rect = tooltip.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 8;
      const maxTop = window.innerHeight - rect.height - 8;
      const left = Math.max(8, Math.min(clientX + tooltipOffset, maxLeft));
      const top = Math.max(8, Math.min(clientY + tooltipOffset, maxTop));

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    function hideTooltip() {
      tooltip.classList.remove('is-visible');
    }

    for (const node of document.querySelectorAll('.export-node[data-node-id]')) {
      const nodeId = node.getAttribute('data-node-id');
      if (!nodeId) continue;

      const meta = interactionMetaByNodeId[nodeId];
      if (!meta) continue;

      node.addEventListener('mouseenter', (event) => {
        renderTooltip(meta);
        placeTooltip(event.clientX, event.clientY);
      });

      node.addEventListener('mousemove', (event) => {
        if (!tooltip.classList.contains('is-visible')) {
          renderTooltip(meta);
        }
        placeTooltip(event.clientX, event.clientY);
      });

      node.addEventListener('mouseleave', hideTooltip);

      if (meta.groupUrl) {
        node.addEventListener('click', () => {
          window.open(meta.groupUrl, '_blank', 'noopener,noreferrer');
        });
      }
    }

    document.addEventListener('scroll', hideTooltip, { passive: true });
  </script>
</body>
</html>`;
	}, [baseUrl, data, generateSVGData]);
};

interface ExportInteractionMeta {
	alternateParentTitles?: string[];
	groupTypeName?: string;
	groupUrl?: string;
	metadataLines?: string[];
	pathTitles?: string[];
	primaryParentSource?: 'churchtools-field' | 'fallback' | 'root';
	title: string;
}

function createGroupUrl(baseUrl: string | undefined, groupId: number): string | undefined {
	if (!baseUrl) return undefined;
	return `${baseUrl}/groups/${String(groupId)}`;
}
