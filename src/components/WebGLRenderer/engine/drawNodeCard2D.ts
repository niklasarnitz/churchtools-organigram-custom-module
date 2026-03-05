import type { PreviewGraphNodeData } from '../../../types/GraphNode';
import { oklchToHex } from '../../../globals/Colors';

export interface NodeCardMetrics {
    width: number;
    height: number;
    headerHeight: number;
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


export function measureNodeCard(
    ctx: CanvasRenderingContext2D,
    data: PreviewGraphNodeData,
    showGroupTypes: boolean,
): NodeCardMetrics {
    const titleFont = `bold ${TITLE_FONT_SIZE}px Lato, sans-serif`;
    const groupTypeFont = `bold ${GROUP_TYPE_FONT_SIZE}px Lato, sans-serif`;
    const memberFont = `${MEMBER_FONT_SIZE}px Lato, sans-serif`;

    // Measure title width
    let contentWidth = measureText(ctx, data.title, titleFont) + HEADER_PADDING_X * 2;
    
    // Check group type width
    if (showGroupTypes) {
        const gtWidth = measureText(ctx, data.groupTypeName.toUpperCase(), groupTypeFont) + HEADER_PADDING_X * 2;
        contentWidth = Math.max(contentWidth, gtWidth);
    }

    // Pre-group members by roleId to avoid repeated filtering
    const membersByRoleId = new Map<number, typeof data.members>();
    for (const m of data.members) {
        let list = membersByRoleId.get(m.groupTypeRoleId);
        if (!list) {
            list = [];
            membersByRoleId.set(m.groupTypeRoleId, list);
        }
        list.push(m);
    }

    const rolesWithMembers = data.roles.filter(role => membersByRoleId.has(role.id));

    for (const role of rolesWithMembers) {
        const personsInRole = membersByRoleId.get(role.id)!;
        let rowWidth = 0;
        for (const member of personsInRole) {
            const person = data.personsById[member.personId];
            const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
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
            const personsInRole = membersByRoleId.get(role.id)!;
            
            bodyHeight += ROLE_FONT_SIZE + 4; // role label
            
            // Calculate badge rows
            const innerWidth = width - NODE_PADDING * 2;
            let currentRowWidth = 0;
            let rows = 1;
            for (const member of personsInRole) {
                const person = data.personsById[member.personId];
                const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
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

    return { width, height: headerHeight + bodyHeight, headerHeight };
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
): void {
    const borderColor = oklchToHex(data.color.shades[300]);
    const headerBg = oklchToHex(data.color.shades[100]);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Card background (white body)
    roundRect(ctx, x, y, width, totalHeight, BORDER_RADIUS);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

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
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${TITLE_FONT_SIZE}px Lato, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.title, x + width / 2, y + HEADER_PADDING_Y + TITLE_FONT_SIZE / 2, width - HEADER_PADDING_X * 2);

    // Group type
    if (showGroupTypes) {
        ctx.fillStyle = '#64748b';
        ctx.font = `bold ${GROUP_TYPE_FONT_SIZE}px Lato, sans-serif`;
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

export function drawNodeCard(
    ctx: CanvasRenderingContext2D,
    data: PreviewGraphNodeData,
    showGroupTypes: boolean,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    const borderColor = oklchToHex(data.color.shades[300]);
    const headerBg = oklchToHex(data.color.shades[100]);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Card background
    roundRect(ctx, x, y, width, height, BORDER_RADIUS);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

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

    // Check if we have members to decide if we draw border-bottom
    const rolesWithMembers = data.roles.filter(role =>
        data.members.some(m => m.groupTypeRoleId === role.id)
    );
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
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = `bold ${TITLE_FONT_SIZE}px Lato, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.title, x + width / 2, y + HEADER_PADDING_Y + TITLE_FONT_SIZE / 2, width - HEADER_PADDING_X * 2);

    // Group type
    if (showGroupTypes) {
        ctx.fillStyle = '#64748b'; // slate-500
        ctx.font = `bold ${GROUP_TYPE_FONT_SIZE}px Lato, sans-serif`;
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
        const innerWidth = width - NODE_PADDING * 2;

        for (const role of rolesWithMembers) {
            const personsInRole = data.members.filter(m => m.groupTypeRoleId === role.id);
            if (personsInRole.length === 0) continue;

            // Role label
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.font = `bold ${ROLE_FONT_SIZE}px Lato, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.letterSpacing = '1px';
            ctx.fillText(role.name.toUpperCase(), x + NODE_PADDING, cursorY);
            ctx.letterSpacing = '0px';
            cursorY += ROLE_FONT_SIZE + 6;

            // Member badges
            ctx.font = `${MEMBER_FONT_SIZE}px Lato, sans-serif`;
            let badgeX = x + NODE_PADDING;

            for (const member of personsInRole) {
                const person = data.personsById[member.personId];
                const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown Person';
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
                ctx.fillStyle = '#f1f5f9'; // slate-100
                ctx.fill();

                // Badge text
                ctx.fillStyle = '#334155'; // slate-700
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
