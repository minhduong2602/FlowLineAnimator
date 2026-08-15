export interface Point {
  x: number;
  y: number;
}

export interface AnchorPoint {
  id: string;
  point: Point;
  handleIn?: Point | null;
  handleOut?: Point | null;
  isCorner?: boolean;
  boundTo?: { pathId: string; anchorId: string } | null;
}

export type DrawTool = 'select' | 'direct-select' | 'pen' | 'pencil' | 'curve' | 'line' | 'add-anchor' | 'delete-anchor' | 'freehand' | 'connector';

export type CurveType = 
  | 'monotoneX'
  | 'natural'
  | 'linear'
  | 'basis'
  | 'step'
  | 'cardinal';

export type DashPresetId = 
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'morse'
  | 'neon'
  | 'racing'
  | 'custom';

export interface DashPattern {
  id: DashPresetId;
  name: string;
  array: string; // e.g. "24, 12"
  dashLength: number;
  gapLength: number;
}

export interface GradientStop {
  offset: string;
  color: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  stops: GradientStop[];
  background: string;
}

export interface DrawingPath {
  id: string;
  name: string;
  anchors: AnchorPoint[];
  points?: Point[];
  closed?: boolean;
  pathType: string;
  presetType?: 'wave' | 'spiral' | 'infinity' | 'zigzag' | 'star' | 'circle';
  strokeWidth: number;
  strokeAlign?: 'center' | 'inside' | 'outside';
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  cornerRadius?: number; // 0 to 50px corner rounding
  routing?: 'bezier' | 'straight' | 'elbow' | 'smooth';
  label?: string;
  lineJumps?: boolean;
  color: string;
  gradientId: string;
  dashPreset: DashPresetId;
  customDashLength: number;
  customGapLength: number;
  customDash2?: number;
  customGap2?: number;
  flowSpeed: number;
  flowDirection: 'forward' | 'reverse';
  showGlow: boolean;
  opacity: number;
  enabled: boolean;
}

export interface ArtboardSettings {
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  globalSpeed: number;
  pencilSmoothness: number; // 1 to 10
}

export interface DataPoint {
  timestamp: number;
  values: Record<string, number>;
}

export interface StreamConfig {
  id: string;
  name: string;
  color: string;
  unit: string;
  enabled: boolean;
}

export interface ChartSettings {
  curveType: CurveType;
  dashPreset: DashPresetId;
  customDashLength: number;
  customGapLength: number;
  flowSpeed: number;
  flowDirection: 'forward' | 'reverse';
  strokeWidth: number;
  lineCap: 'butt' | 'round' | 'square';
  showGlow: boolean;
  showPoints: boolean;
  showFillArea: boolean;
  fillOpacity: number;
  showGrid: boolean;
  showAxes: boolean;
  gradientId: string;
  historyLength: number;
}
