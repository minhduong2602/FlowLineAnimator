import { GradientPreset, DashPattern } from '../types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    background: 'linear-gradient(135deg, #00F2FF 0%, #7000FF 50%, #FF007F 100%)',
    stops: [
      { offset: '0%', color: '#00F2FF' },
      { offset: '50%', color: '#7000FF' },
      { offset: '100%', color: '#FF007F' }
    ]
  },
  {
    id: 'emerald',
    name: 'Matrix Emerald',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #34D399 100%)',
    stops: [
      { offset: '0%', color: '#10B981' },
      { offset: '50%', color: '#059669' },
      { offset: '100%', color: '#34D399' }
    ]
  },
  {
    id: 'sunset',
    name: 'Solar Flare',
    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)',
    stops: [
      { offset: '0%', color: '#F59E0B' },
      { offset: '50%', color: '#EF4444' },
      { offset: '100%', color: '#EC4899' }
    ]
  },
  {
    id: 'electric',
    name: 'Electric Cobalt',
    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #60A5FA 100%)',
    stops: [
      { offset: '0%', color: '#3B82F6' },
      { offset: '50%', color: '#1D4ED8' },
      { offset: '100%', color: '#60A5FA' }
    ]
  },
  {
    id: 'monochrome',
    name: 'Hyper White',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #A1A1AA 50%, #52525B 100%)',
    stops: [
      { offset: '0%', color: '#FFFFFF' },
      { offset: '50%', color: '#A1A1AA' },
      { offset: '100%', color: '#52525B' }
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
