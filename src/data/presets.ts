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
