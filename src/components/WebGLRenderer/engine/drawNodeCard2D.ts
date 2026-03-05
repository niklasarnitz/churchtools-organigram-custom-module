import type { PreviewGraphNodeData } from '../../../types/GraphNode';

import { oklchToHex } from '../../../globals/Colors';

export interface NodeCardMetrics {
    headerHeight: number;
    height: number;
    width: number;
}

const NODE_MIN_WIDTH = 220;
const NODE_MAX_WIDTH = 300;
const NODE_PADDING = 16;
const HEADER_PADDING_Y = 12;
const HEADER_PADDING_X = 16;
const TITLE_FONT_SIZE = 14;
const GROUP_TYPE_FONT_SIZE = 10;
const ROLE_FONT_SIZE = 10;
const MEMBER_FONT_SIZE = 12;
const BADGE_PADDING_X = 8;
const BADGE_PADDING_Y = 4;
const BADGE_HEIGHT = MEMBER_FONT_SIZE + BADGE_PADDING_Y * 2;
const BADGE_GAP = 4;
const ROLE_GAP = 8;
const BORDER_RADIUS = 12;
const BORDER_WIDTH = 2;

export function drawNodeCard(
    ctx: CanvasRenderingContext2D,
    data: PreviewGraphNodeData,
    showGroupTypes: boolean,
    x: number,
    y: number,
    width: number,
    height: number,
    isDarkMode = false,
): void {
    const borderColor = oklchToHex(data.color.shades[isDarkMode ? 700 : 300]);
    const headerBg = oklchToHex(data.color.shades[isDarkMode ? 900 : 100]);

    // Card background
    roundRect(ctx, x, y, width, height, BORDER_RADIUS);
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff';
    ctx.fill();

    // Border
    roundRect(ctx, x, y, width, height, BORDER_RADIUS);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.stroke();

    // Clip to card bounds
    ctx.save();
    roundRect(ctx, x + 1, y + 1, width - 2, height - 2, BORDER_RADIUS - 1);
    ctx.clip();

    // Header background
    let headerHeight = HEADER_PADDING_Y * 2 + TITLE_FONT_SIZE;
    if (showGroupTypes) {
        headerHeight += GROUP_TYPE_FONT_SIZE + 4;
    }

    const rolesWithMembers = data.roles.filter(role => data.memberNamesByRoleId.has(role.id));
    const hasMembers = rolesWithMembers.length > 0;

    ctx.fillStyle = headerBg;
    ctx.fillRect(x, y, width, headerHeight);

    // Header bottom border (only if has members)
    if (hasMembers) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = BORDER_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, y + headerHeight);
        ctx.lineTo(x + width, y + headerHeight);
        ctx.stroke();
    }

    // Title
    ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
    ctx.font = `bold ${String(TITLE_FONT_SIZE)}px Lato, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.title, x + width / 2, y + HEADER_PADDING_Y + TITLE_FONT_SIZE / 2, width - HEADER_PADDING_X * 2);

    // Group type
    if (showGroupTypes) {
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
        ctx.font = `bold ${String(GROUP_TYPE_FONT_SIZE)}px Lato, sans-serif`;
        ctx.letterSpacing = '2px';
        ctx.fillText(
            data.groupTypeName.toUpperCase(),
            x + width / 2,
            y + HEADER_PADDING_Y + TITLE_FONT_SIZE + 4 + GROUP_TYPE_FONT_SIZE / 2,
            width - HEADER_PADDING_X * 2
        );
        ctx.letterSpacing = '0px';
    }

    // Body with roles and members
    if (hasMembers) {
        let cursorY = y + headerHeight + NODE_PADDING;

        for (const role of rolesWithMembers) {
            const names = data.memberNamesByRoleId.get(role.id) ?? [];
            if (names.length === 0) continue;

            // Role label
            ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
            ctx.font = `bold ${String(ROLE_FONT_SIZE)}px Lato, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.letterSpacing = '1px';
            ctx.fillText(role.name.toUpperCase(), x + NODE_PADDING, cursorY);
            ctx.letterSpacing = '0px';
            cursorY += ROLE_FONT_SIZE + 6;

            // Member badges
            ctx.font = `${String(MEMBER_FONT_SIZE)}px Lato, sans-serif`;
            let badgeX = x + NODE_PADDING;

            for (const name of names) {
                const textWidth = ctx.measureText(name).width;
                const badgeWidth = textWidth + BADGE_PADDING_X * 2;

                // Wrap to next row if needed
                if (badgeX + badgeWidth > x + width - NODE_PADDING && badgeX > x + NODE_PADDING) {
                    badgeX = x + NODE_PADDING;
                    cursorY += BADGE_HEIGHT + BADGE_GAP;
                }

                // Badge background
                const badgeR = BADGE_HEIGHT / 2;
                roundRect(ctx, badgeX, cursorY, badgeWidth, BADGE_HEIGHT, badgeR);
                ctx.fillStyle = isDarkMode ? '#1e293b' : '#f1f5f9';
                ctx.fill();

                // Badge text
                ctx.fillStyle = isDarkMode ? '#cbd5e1' : '#334155';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(name, badgeX + BADGE_PADDING_X, cursorY + BADGE_HEIGHT / 2);

                badgeX += badgeWidth + BADGE_GAP;
            }
            cursorY += BADGE_HEIGHT + ROLE_GAP;
        }
    }

    ctx.restore();
}

export function drawNodeCardHeaderOnly(
    ctx: CanvasRenderingContext2D,
    data: PreviewGraphNodeData,
    showGroupTypes: boolean,
    x: number,
    y: number,
    width: number,
    totalHeight: number,
    headerHeight: number,
    isDarkMode = false,
): void {
    const borderColor = oklchToHex(data.color.shades[isDarkMode ? 700 : 300]);
    const headerBg = oklchToHex(data.color.shades[isDarkMode ? 900 : 100]);

    // Card background (white body)
    roundRect(ctx, x, y, width, totalHeight, BORDER_RADIUS);
    ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff';
    ctx.fill();

    // Border
    roundRect(ctx, x, y, width, totalHeight, BORDER_RADIUS);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.stroke();

    // Clip to card bounds
    ctx.save();
    roundRect(ctx, x + 1, y + 1, width - 2, totalHeight - 2, BORDER_RADIUS - 1);
    ctx.clip();

    // Header background
    ctx.fillStyle = headerBg;
    ctx.fillRect(x, y, width, headerHeight);

    // Header bottom border
    if (totalHeight > headerHeight) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = BORDER_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, y + headerHeight);
        ctx.lineTo(x + width, y + headerHeight);
        ctx.stroke();
    }

    // Title
    ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
    ctx.font = `bold ${String(TITLE_FONT_SIZE)}px Lato, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.title, x + width / 2, y + HEADER_PADDING_Y + TITLE_FONT_SIZE / 2, width - HEADER_PADDING_X * 2);

    // Group type
    if (showGroupTypes) {
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
        ctx.font = `bold ${String(GROUP_TYPE_FONT_SIZE)}px Lato, sans-serif`;
        ctx.letterSpacing = '2px';
        ctx.fillText(
            data.groupTypeName.toUpperCase(),
            x + width / 2,
            y + HEADER_PADDING_Y + TITLE_FONT_SIZE + 4 + GROUP_TYPE_FONT_SIZE / 2,
            width - HEADER_PADDING_X * 2
        );
        ctx.letterSpacing = '0px';
    }

    ctx.restore();
}


export function measureNodeCard(
    ctx: CanvasRenderingContext2D,
    data: PreviewGraphNodeData,
    showGroupTypes: boolean,
): NodeCardMetrics {
    const titleFont = `bold ${String(TITLE_FONT_SIZE)}px Lato, sans-serif`;
    const groupTypeFont = `bold ${String(GROUP_TYPE_FONT_SIZE)}px Lato, sans-serif`;
    const memberFont = `${String(MEMBER_FONT_SIZE)}px Lato, sans-serif`;

    // Measure title width
    let contentWidth = measureText(ctx, data.title, titleFont) + HEADER_PADDING_X * 2;
    
    // Check group type width
    if (showGroupTypes) {
        const gtWidth = measureText(ctx, data.groupTypeName.toUpperCase(), groupTypeFont) + HEADER_PADDING_X * 2;
        contentWidth = Math.max(contentWidth, gtWidth);
    }

    const rolesWithMembers = data.roles.filter(role => data.memberNamesByRoleId.has(role.id));

    for (const role of rolesWithMembers) {
        const names = data.memberNamesByRoleId.get(role.id) ?? [];
        let rowWidth = 0;
        for (const name of names) {
            const badgeWidth = measureText(ctx, name, memberFont) + BADGE_PADDING_X * 2;
            rowWidth += badgeWidth + BADGE_GAP;
        }
        contentWidth = Math.max(contentWidth, rowWidth + NODE_PADDING * 2);
    }

    const width = Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, contentWidth));

    // Calculate height
    let headerHeight = HEADER_PADDING_Y * 2 + TITLE_FONT_SIZE;
    if (showGroupTypes) {
        headerHeight += GROUP_TYPE_FONT_SIZE + 4;
    }

    let bodyHeight = 0;
    if (rolesWithMembers.length > 0) {
        bodyHeight = NODE_PADDING;
        for (const role of rolesWithMembers) {
            const names = data.memberNamesByRoleId.get(role.id) ?? [];
            
            bodyHeight += ROLE_FONT_SIZE + 4; // role label
            
            // Calculate badge rows
            const innerWidth = width - NODE_PADDING * 2;
            let currentRowWidth = 0;
            let rows = 1;
            for (const name of names) {
                const badgeWidth = measureText(ctx, name, memberFont) + BADGE_PADDING_X * 2;
                if (currentRowWidth + badgeWidth + BADGE_GAP > innerWidth && currentRowWidth > 0) {
                    rows++;
                    currentRowWidth = 0;
                }
                currentRowWidth += badgeWidth + BADGE_GAP;
            }
            bodyHeight += rows * (BADGE_HEIGHT + BADGE_GAP) + ROLE_GAP;
        }
        bodyHeight += NODE_PADDING / 2;
    }

    return { headerHeight, height: headerHeight + bodyHeight, width };
}

function measureText(ctx: CanvasRenderingContext2D, text: string, font: string): number {
    ctx.font = font;
    return ctx.measureText(text).width;
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
