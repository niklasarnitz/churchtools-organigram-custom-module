export enum Position {
	Bottom = 'bottom',
	Left = 'left',
	Right = 'right',
	Top = 'top',
}

export interface Edge {
	animated?: boolean;
	className?: string;
	id: string;
	markerEnd?: { color: string; height: number; type: string; width: number };
	source: string;
	style?: React.CSSProperties;
	target: string;
	type?: string;
}

export interface Node<T = unknown> {
	data: T;
	height?: number;
	id: string;
	position: { x: number; y: number };
	sourcePosition?: Position;
	targetPosition?: Position;
	type?: string;
	width?: number;
}
