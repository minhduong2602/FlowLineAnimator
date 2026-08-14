import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ChartSettings, DataPoint, StreamConfig } from '../types';
import { getD3Curve, DASH_PRESETS, GRADIENT_PRESETS } from '../utils/d3Helpers';

interface ChartViewProps {
  data: DataPoint[];
  streams: StreamConfig[];
  settings: ChartSettings;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export const ChartView: React.FC<ChartViewProps> = ({
  data,
  streams,
  settings,
  svgRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dashOffset, setDashOffset] = useState<number>(0);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Continuous flow animation loop for dashoffset
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setDashOffset((prev) => {
        const speed = settings.flowSpeed * 40; // pixels per second
        const directionMultiplier = settings.flowDirection === 'forward' ? -1 : 1;
        return prev + speed * dt * directionMultiplier;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [settings.flowSpeed, settings.flowDirection]);

  const { width, height } = dimensions;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const chartWidth = Math.max(100, width - margin.left - margin.right);
  const chartHeight = Math.max(100, height - margin.top - margin.bottom);

  // Scales
  const xScale = d3.scaleLinear()
    .domain([0, Math.max(10, settings.historyLength - 1)])
    .range([0, chartWidth]);

  // Find min and max values across active streams
  const activeStreams = streams.filter(s => s.enabled);
  let allValues: number[] = [];
  data.forEach(d => {
    activeStreams.forEach(s => {
      if (d.values[s.id] !== undefined) {
        allValues.push(d.values[s.id]);
      }
    });
  });

  const yMin = allValues.length ? Math.min(...allValues) * 0.9 : 0;
  const yMax = allValues.length ? Math.max(...allValues) * 1.1 : 100;

  const yScale = d3.scaleLinear()
    .domain([yMin === yMax ? yMin - 10 : yMin, yMax])
    .range([chartHeight, 0])
    .nice();

  // Curve factory
  const curveFactory = getD3Curve(settings.curveType);

  // Dash array string
  const selectedDashPreset = DASH_PRESETS.find(p => p.id === settings.dashPreset) || DASH_PRESETS[1];
  const strokeDashArray = settings.dashPreset === 'custom'
    ? `${settings.customDashLength}, ${settings.customGapLength}`
    : selectedDashPreset.array;

  // Selected gradient preset
  const gradientPreset = GRADIENT_PRESETS.find(g => g.id === settings.gradientId) || GRADIENT_PRESETS[0];

  // Mouse move handler for interactive crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    if (mouseX < 0 || mouseX > chartWidth || data.length === 0) {
      setHoverIndex(null);
      return;
    }
    const xValue = xScale.invert(mouseX);
    const index = Math.round(xValue);
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoverDataPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div 
      ref={containerRef} 
      className="flex-1 w-full h-full relative bg-slate-950 overflow-hidden select-none flex flex-col items-center justify-center"
      style={{ backgroundColor: gradientPreset.background }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full cursor-crosshair"
      >
        <defs>
          {/* Linear Gradient */}
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientPreset.stops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Area Gradient */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            {gradientPreset.stops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={settings.fillOpacity} />
            ))}
          </linearGradient>

          {/* Neon Glow Filter */}
          {settings.showGlow && (
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}

          {/* Grid Pattern */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background Grid Box */}
        {settings.showGrid && (
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            <rect width={chartWidth} height={chartHeight} fill="url(#gridPattern)" rx="8" />
          </g>
        )}

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Y Axis Grid Lines & Ticks */}
          {settings.showAxes && (
            <g className="y-axis">
              {yScale.ticks(5).map((tick, i) => (
                <g key={i} transform={`translate(0, ${yScale(tick)})`}>
                  <line x1="0" x2={chartWidth} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                  <text x="-12" y="4" fill="rgba(148, 163, 184, 0.7)" fontSize="10" fontFamily="monospace" textAnchor="end">
                    {tick.toFixed(0)}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Area Fills */}
          {settings.showFillArea && activeStreams.map(stream => {
            const areaGenerator = d3.area<DataPoint>()
              .x((d, i) => xScale(i))
              .y0(chartHeight)
              .y1(d => yScale(d.values[stream.id] ?? 0))
              .curve(curveFactory);

            const areaPath = areaGenerator(data);
            if (!areaPath) return null;

            return (
              <path
                key={`area-${stream.id}`}
                d={areaPath}
                fill="url(#areaGradient)"
                opacity={0.6}
              />
            );
          })}

          {/* Continuous Flow Dashed Lines for each stream */}
          {activeStreams.map(stream => {
            const lineGenerator = d3.line<DataPoint>()
              .x((d, i) => xScale(i))
              .y(d => yScale(d.values[stream.id] ?? 0))
              .curve(curveFactory);

            const pathData = lineGenerator(data);
            if (!pathData) return null;

            return (
              <g key={`stream-group-${stream.id}`}>
                {/* Glow layer */}
                {settings.showGlow && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={stream.color}
                    strokeWidth={settings.strokeWidth * 2}
                    strokeLinecap={settings.lineCap}
                    strokeLinejoin="round"
                    strokeDasharray={strokeDashArray}
                    strokeDashoffset={dashOffset}
                    opacity={0.4}
                    filter="url(#neonGlow)"
                  />
                )}

                {/* Main continuous flow dashed line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={stream.color}
                  strokeWidth={settings.strokeWidth}
                  strokeLinecap={settings.lineCap}
                  strokeLinejoin="round"
                  strokeDasharray={strokeDashArray}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-75"
                />

                {/* Data Points / Nodes */}
                {settings.showPoints && data.map((d, i) => {
                  const val = d.values[stream.id];
                  if (val === undefined) return null;
                  return (
                    <circle
                      key={`point-${i}`}
                      cx={xScale(i)}
                      cy={yScale(val)}
                      r={settings.strokeWidth * 0.8}
                      fill={stream.color}
                      className="transition-all duration-200 hover:scale-150"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Interactive Hover Crosshair & Tooltip */}
          {hoverIndex !== null && hoverDataPoint && (
            <g transform={`translate(${xScale(hoverIndex)}, 0)`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={chartHeight}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3,3"
                strokeWidth="1.5"
              />
              {activeStreams.map(stream => {
                const val = hoverDataPoint.values[stream.id];
                if (val === undefined) return null;
                return (
                  <circle
                    key={`hover-dot-${stream.id}`}
                    cx="0"
                    cy={yScale(val)}
                    r="5"
                    fill={stream.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </g>
      </svg>

      {/* Floating Tooltip Card */}
      {hoverIndex !== null && hoverDataPoint && (
        <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-none z-10 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="text-slate-400 font-mono border-b border-slate-800 pb-1.5 flex justify-between gap-4">
            <span>Index: #{hoverIndex}</span>
            <span>{new Date(hoverDataPoint.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="space-y-1">
            {activeStreams.map(stream => (
              <div key={stream.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stream.color }} />
                  <span className="text-slate-300 font-medium">{stream.name}</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {(hoverDataPoint.values[stream.id] ?? 0).toFixed(2)} {stream.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
