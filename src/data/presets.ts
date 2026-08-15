import { GradientPreset, DashPattern } from '../types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'cyberpunk',
    name: 'Ink Blueprint',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #737373 100%)',
    stops: [
      { offset: '0%', color: '#0a0a0a' },
      { offset: '50%', color: '#171717' },
      { offset: '100%', color: '#737373' }
    ]
  },
  {
    id: 'emerald',
    name: 'Mid Gray',
    background: 'linear-gradient(135deg, #737373 0%, #a3a3a3 50%, #d4d4d4 100%)',
    stops: [
      { offset: '0%', color: '#737373' },
      { offset: '50%', color: '#a3a3a3' },
      { offset: '100%', color: '#d4d4d4' }
    ]
  },
  {
    id: 'sunset',
    name: 'Subtle Silver',
    background: 'linear-gradient(135deg, #a3a3a3 0%, #d4d4d4 50%, #e5e5e5 100%)',
    stops: [
      { offset: '0%', color: '#a3a3a3' },
      { offset: '50%', color: '#d4d4d4' },
      { offset: '100%', color: '#e5e5e5' }
    ]
  },
  {
    id: 'electric',
    name: 'Graphite',
    background: 'linear-gradient(135deg, #404040 0%, #525252 50%, #737373 100%)',
    stops: [
      { offset: '0%', color: '#404040' },
      { offset: '50%', color: '#525252' },
      { offset: '100%', color: '#737373' }
    ]
  },
  {
    id: 'monochrome',
    name: 'Hairline Accent',
    background: 'linear-gradient(135deg, #d4d4d4 0%, #e5e5e5 50%, #fafafa 100%)',
    stops: [
      { offset: '0%', color: '#d4d4d4' },
      { offset: '50%', color: '#e5e5e5' },
      { offset: '100%', color: '#fafafa' }
    ]
  }
];

export const DASH_PRESETS: DashPattern[] = [
  { id: 'solid', name: 'Solid Line', array: 'none', dashLength: 0, gapLength: 0 },
  { id: 'neon', name: 'Neon Pulse Flow', array: '24, 12', dashLength: 24, gapLength: 12 },
  { id: 'dashed', name: 'Standard Dash', array: '12, 8', dashLength: 12, gapLength: 8 },
  { id: 'dotted', name: 'Light Dots', array: '4, 6', dashLength: 4, gapLength: 6 },
  { id: 'morse', name: 'Morse Code', array: '20, 6, 6, 6', dashLength: 20, gapLength: 6 },
  { id: 'racing', name: 'Racing Track', array: '16, 16', dashLength: 16, gapLength: 16 },
  { id: 'custom', name: 'Custom Dash', array: '15, 10', dashLength: 15, gapLength: 10 }
];

import { CapType } from '../types';

export interface CapPreset {
  id: CapType;
  name: string;
  svgPreview: string; // inline SVG path for thumbnail
}

export const CAP_PRESETS: CapPreset[] = [
  { id: 'none',        name: 'None',         svgPreview: 'M4 8 H28' },
  { id: 'arrow',       name: 'Arrow',        svgPreview: 'M4 8 H22 M16 4 L24 8 L16 12' },
  { id: 'solidArrow',  name: 'Solid Arrow',  svgPreview: 'M4 8 H18 M16 4 L26 8 L16 12 Z' },
  { id: 'circle',      name: 'Circle',       svgPreview: 'M4 8 H20 M26 8 m-4 0 a4 4 0 1 1 8 0 a4 4 0 1 1 -8 0' },
  { id: 'diamond',     name: 'Diamond',      svgPreview: 'M4 8 H18 M22 4 L28 8 L22 12 L16 8 Z' },
  { id: 'square',      name: 'Square',       svgPreview: 'M4 8 H18 M20 4 H28 V12 H20 Z' },
  { id: 'bar',         name: 'Bar',          svgPreview: 'M4 8 H28 M28 4 V12' },
];

