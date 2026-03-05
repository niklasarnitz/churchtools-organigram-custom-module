export enum Position {
	Left = 'left',
	Top = 'top',
	Right = 'right',
	Bottom = 'bottom',
}

export interface Node<T = any> {
	id: string;
	position: { x: number; y: number };
	data: T;
	width?: number;
	height?: number;
	sourcePosition?: Position;
	targetPosition?: Position;
	type?: string;
}

export interface Edge {
	id: string;
	source: string;
	target: string;
	animated?: boolean;
	style?: React.CSSProperties;
	markerEnd?: any;
	className?: string;
	type?: string;
}
