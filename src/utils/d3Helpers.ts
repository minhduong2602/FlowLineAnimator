import * as d3 from 'd3';
import { CurveType, DashPattern } from '../types';

export function getD3Curve(curveType: CurveType): d3.CurveFactory {
  switch (curveType) {
    case 'monotoneX':
      return d3.curveMonotoneX;
    case 'natural':
      return d3.curveNatural;
    case 'basis':
      return d3.curveBasis;
    case 'step':
      return d3.curveStep;
    case 'cardinal':
      return d3.curveCardinal;
    case 'linear':
    default:
      return d3.curveLinear;
  }
}

export const DASH_PRESETS: DashPattern[] = [
  { id: 'solid', name: 'Solid Line', array: 'none', dashLength: 0, gapLength: 0 },
  { id: 'dashed', name: 'Standard Dash', array: '12, 6', dashLength: 12, gapLength: 6 },
  { id: 'dotted', name: 'Fine Dots', array: '3, 4', dashLength: 3, gapLength: 4 },
  { id: 'morse', name: 'Morse Flow', array: '16, 4, 4, 4', dashLength: 16, gapLength: 4 },
  { id: 'neon', name: 'Neon Pulse', array: '20, 10, 5, 10', dashLength: 20, gapLength: 10 },
  { id: 'racing', name: 'Racing Stripe', array: '8, 8', dashLength: 8, gapLength: 8 },
  { id: 'custom', name: 'Custom Pattern', array: '10, 5', dashLength: 10, gapLength: 5 },
];

export const GRADIENT_PRESETS = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    stops: [
      { offset: '0%', color: '#ff007f' },
      { offset: '50%', color: '#7928ca' },
      { offset: '100%', color: '#00dfd8' }
    ],
    background: '#090a0f'
  },
  {
    id: 'emerald',
    name: 'Emerald Pulse',
    stops: [
      { offset: '0%', color: '#10b981' },
      { offset: '50%', color: '#06b6d4' },
      { offset: '100%', color: '#3b82f6' }
    ],
    background: '#04110f'
  },
  {
    id: 'sunset',
    name: 'Sunset Blaze',
    stops: [
      { offset: '0%', color: '#f59e0b' },
      { offset: '50%', color: '#ef4444' },
      { offset: '100%', color: '#ec4899' }
    ],
    background: '#12080c'
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    stops: [
      { offset: '0%', color: '#34d399' },
      { offset: '50%', color: '#60a5fa' },
      { offset: '100%', color: '#818cf8' }
    ],
    background: '#060a12'
  },
  {
    id: 'gold',
    name: 'Royal Gold',
    stops: [
      { offset: '0%', color: '#fbbf24' },
      { offset: '50%', color: '#f59e0b' },
      { offset: '100%', color: '#d97706' }
    ],
    background: '#141006'
  },
  {
    id: 'monochrome',
    name: 'Clean Slate',
    stops: [
      { offset: '0%', color: '#ffffff' },
      { offset: '50%', color: '#94a3b8' },
      { offset: '100%', color: '#475569' }
    ],
    background: '#0f172a'
  }
];
