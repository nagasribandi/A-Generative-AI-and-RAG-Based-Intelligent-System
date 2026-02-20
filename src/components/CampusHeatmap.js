import React, { useState, useMemo } from 'react';

// =====================================================
// Vardhaman College of Engineering - Actual Campus Layout
// Based on satellite imagery of Shamshabad campus
// =====================================================
// Layout reference:
//   Bottom: Nagarguda-Shamshabad Road (main road)
//   Left:   Block 1 (large L-shaped academic - CSE Dept)
//   Center: Block 2, Block 3 (academic buildings)
//   Right:  Block 4, Block 5, Library
//   Top-Right: Hostel area along Vardhaman Hostel Rd
//   Top-Center: Sports Ground & Gym
//   Bottom-Left: Parking
// =====================================================

const CAMPUS_ZONES = [
  {
    id: 'block-1',
    label: 'Block 1',
    matchPatterns: ['Block 1', 'Main Building', 'IT Block', 'Computer Lab'],
    // Large L-shaped building on the left (CSE / main academic)
    path: 'M 40 340 L 40 130 L 200 130 L 200 220 L 130 220 L 130 340 Z',
    labelPos: { x: 105, y: 180 }
  },
  {
    id: 'block-2',
    label: 'Block 2',
    matchPatterns: ['Block 2', 'Science Block'],
    // Building center-left area
    path: 'M 215 150 L 340 150 L 340 260 L 215 260 Z',
    labelPos: { x: 277, y: 205 }
  },
  {
    id: 'block-3',
    label: 'Block 3',
    matchPatterns: ['Block 3', 'Arts Block', 'Block C'],
    // Building center area
    path: 'M 215 275 L 340 275 L 340 380 L 215 380 Z',
    labelPos: { x: 277, y: 328 }
  },
  {
    id: 'block-4',
    label: 'Block 4',
    matchPatterns: ['Block 4'],
    // Building right-center
    path: 'M 360 150 L 490 150 L 490 260 L 360 260 Z',
    labelPos: { x: 425, y: 205 }
  },
  {
    id: 'block-5',
    label: 'Block 5',
    matchPatterns: ['Block 5'],
    // Building right area (near Vardhaman College marker)
    path: 'M 360 275 L 490 275 L 490 380 L 360 380 Z',
    labelPos: { x: 425, y: 328 }
  },
  {
    id: 'library',
    label: 'Library',
    matchPatterns: ['Library'],
    // Far right building
    path: 'M 510 150 L 620 150 L 620 260 L 510 260 Z',
    labelPos: { x: 565, y: 205 }
  },
  {
    id: 'hostel',
    label: 'Hostel',
    matchPatterns: ['Hostel', 'Boys Hostel', 'Girls Hostel'],
    // Top-right hostel area along Hostel Rd
    path: 'M 500 40 L 670 40 L 670 120 L 500 120 Z',
    labelPos: { x: 585, y: 80 }
  },
  {
    id: 'sports-ground',
    label: 'Sports Ground',
    matchPatterns: ['Sports Complex', 'Sports Ground', 'Gym'],
    // Top-center open area / sports ground
    path: 'M 260 40 L 480 40 L 480 120 L 260 120 Z',
    labelPos: { x: 370, y: 80 }
  },
  {
    id: 'parking',
    label: 'Parking',
    matchPatterns: ['Parking Area', 'Parking'],
    // Bottom-left parking zone
    path: 'M 40 400 L 130 400 L 130 480 L 40 480 Z',
    labelPos: { x: 85, y: 440 }
  },
  {
    id: 'campus-grounds',
    label: 'Campus Grounds',
    matchPatterns: ['Campus Grounds', 'Other', 'Cafeteria', 'Canteen', 'Auditorium'],
    // Central open courtyard / garden area + rest of campus
    path: 'M 145 275 L 200 275 L 200 380 L 145 380 Z',
    labelPos: { x: 172, y: 328 }
  }
];

// Color scale based on complaint count
function getHeatColor(count, maxCount) {
  if (count === 0) return { fill: '#2ecc71', stroke: '#27ae60', level: 'none' };
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.25) return { fill: '#f1c40f', stroke: '#d4ac0d', level: 'low' };
  if (ratio <= 0.5) return { fill: '#e67e22', stroke: '#d35400', level: 'moderate' };
  if (ratio <= 0.75) return { fill: '#e74c3c', stroke: '#c0392b', level: 'high' };
  return { fill: '#c0392b', stroke: '#922b21', level: 'critical' };
}

export default function CampusHeatmap({ complaints, selectedZone, onZoneSelect, filterStatus }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Filter complaints by status if specified
  const filteredComplaints = useMemo(() => {
    if (!filterStatus || filterStatus === 'all') return complaints;
    return complaints.filter(c => c.status?.toLowerCase().replace(/\s+/g, '-') === filterStatus);
  }, [complaints, filterStatus]);

  // Count complaints per zone
  const zoneCounts = useMemo(() => {
    const counts = {};
    CAMPUS_ZONES.forEach(zone => {
      counts[zone.id] = filteredComplaints.filter(c =>
        zone.matchPatterns.some(pattern =>
          c.location?.toLowerCase().includes(pattern.toLowerCase())
        )
      ).length;
    });
    return counts;
  }, [filteredComplaints]);

  const maxCount = useMemo(() => Math.max(...Object.values(zoneCounts), 1), [zoneCounts]);

  // Get complaints for a specific zone
  const getZoneComplaints = (zone) => {
    return filteredComplaints.filter(c =>
      zone.matchPatterns.some(pattern =>
        c.location?.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  };

  const handleMouseMove = (e, zone) => {
    const svgRect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - svgRect.left + 15,
      y: e.clientY - svgRect.top - 10
    });
    setHoveredZone(zone);
  };

  return (
    <div className="campus-heatmap-container">
      <svg
        viewBox="0 0 720 530"
        className="campus-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definitions */}
        <defs>
          <pattern id="grassPattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#1a2a1a" />
            <circle cx="5" cy="5" r="1" fill="#243d24" opacity="0.5" />
            <circle cx="15" cy="15" r="1" fill="#243d24" opacity="0.5" />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background - campus grounds */}
        <rect x="0" y="0" width="720" height="530" rx="16" fill="#0f1923" />
        <rect x="15" y="15" width="690" height="500" rx="12" fill="url(#grassPattern)" opacity="0.6" />

        {/* === ROADS === */}
        {/* Main Road - Nagarguda-Shamshabad Rd (bottom) */}
        <rect x="0" y="490" width="720" height="40" rx="0" fill="#2a2a3a" />
        <line x1="0" y1="510" x2="720" y2="510" stroke="#444" strokeWidth="2" strokeDasharray="20,12" />
        <text x="360" y="517" textAnchor="middle" fill="#666" fontSize="8" fontWeight="600" letterSpacing="2">
          NAGARGUDA — SHAMSHABAD ROAD
        </text>

        {/* Vardhaman Hostel Rd (top horizontal) */}
        <rect x="230" y="125" width="490" height="18" rx="3" fill="#222235" />
        <line x1="230" y1="134" x2="720" y2="134" stroke="#383850" strokeWidth="1" strokeDasharray="8,6" />

        {/* Internal road - vertical connector left */}
        <rect x="200" y="125" width="14" height="365" rx="3" fill="#222235" />

        {/* Internal road - horizontal middle */}
        <rect x="130" y="258" width="510" height="14" rx="3" fill="#222235" />

        {/* Internal road - vertical right */}
        <rect x="495" y="125" width="14" height="365" rx="3" fill="#222235" />

        {/* Entrance road from bottom */}
        <rect x="200" y="475" width="14" height="55" rx="3" fill="#222235" />
        <text x="207" y="505" textAnchor="middle" fill="#8888aa" fontSize="9" fontWeight="700">
          ↑
        </text>

        {/* === LABELS === */}
        <text x="360" y="24" textAnchor="middle" fill="#e0e0e0" fontSize="16" fontWeight="800" letterSpacing="1">
          🏫 VARDHAMAN COLLEGE OF ENGINEERING
        </text>

        {/* Road labels */}
        <text x="680" y="138" textAnchor="end" fill="#555" fontSize="7" fontWeight="600">
          HOSTEL ROAD →
        </text>

        {/* Entrance gate */}
        <rect x="185" y="475" width="44" height="14" rx="4" fill="#333" stroke="#6c5ce7" strokeWidth="1" />
        <text x="207" y="485" textAnchor="middle" fill="#a29bfe" fontSize="7" fontWeight="700">
          GATE
        </text>

        {/* === TREES & GREENERY === */}
        {/* Trees along roads */}
        {[60, 160, 280, 400, 520, 640].map((x, i) => (
          <text key={`t1-${i}`} x={x} y="490" fontSize="10" textAnchor="middle">🌳</text>
        ))}
        {[250, 350, 450, 550].map((x, i) => (
          <text key={`t2-${i}`} x={x} y="124" fontSize="8" textAnchor="middle">🌿</text>
        ))}
        {/* Garden area in courtyard */}
        <text x="172" y="310" textAnchor="middle" fontSize="8">🌿</text>
        <text x="172" y="345" textAnchor="middle" fontSize="8">🌳</text>
        <text x="172" y="370" textAnchor="middle" fontSize="8">🌿</text>

        {/* === ZONE SHAPES (buildings) === */}
        {CAMPUS_ZONES.map(zone => {
          const count = zoneCounts[zone.id];
          const color = getHeatColor(count, maxCount);
          const isSelected = selectedZone?.id === zone.id;
          const isHovered = hoveredZone?.id === zone.id;
          const zoneComplaints = getZoneComplaints(zone);
          const openCount = zoneComplaints.filter(c => c.status === 'Open').length;

          return (
            <g
              key={zone.id}
              className={`zone-group ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => onZoneSelect(zone)}
              onMouseMove={(e) => handleMouseMove(e, zone)}
              onMouseLeave={() => setHoveredZone(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Building shadow */}
              <path
                d={zone.path}
                fill="rgba(0,0,0,0.35)"
                transform="translate(3, 3)"
              />
              {/* Building body */}
              <path
                d={zone.path}
                fill={color.fill}
                stroke={isSelected ? '#fff' : color.stroke}
                strokeWidth={isSelected ? 2.5 : 1.2}
                opacity={isHovered ? 1 : 0.82}
                className="zone-path"
              />
              {/* Building roof lines for detail */}
              <path
                d={zone.path}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
                transform="translate(-2, -2) scale(1.01)"
              />
              {/* Zone label */}
              <text
                x={zone.labelPos.x}
                y={zone.labelPos.y - 8}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="800"
                className="zone-label"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
              >
                {zone.label}
              </text>
              {/* Count */}
              <text
                x={zone.labelPos.x}
                y={zone.labelPos.y + 8}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="600"
                opacity="0.9"
              >
                {count} issue{count !== 1 ? 's' : ''}
              </text>
              {/* Open warning */}
              {openCount > 0 && (
                <text
                  x={zone.labelPos.x}
                  y={zone.labelPos.y + 22}
                  textAnchor="middle"
                  fill="#ffe082"
                  fontSize="8"
                  fontWeight="700"
                >
                  ⚠ {openCount} open
                </text>
              )}
            </g>
          );
        })}

        {/* === COMPASS === */}
        <g transform="translate(670, 55)">
          <circle cx="0" cy="0" r="18" fill="rgba(20,20,40,0.8)" stroke="#444" strokeWidth="1" />
          <text x="0" y="-5" textAnchor="middle" fill="#e74c3c" fontSize="10" fontWeight="800">N</text>
          <text x="0" y="12" textAnchor="middle" fill="#666" fontSize="7">↑</text>
        </g>

        {/* Tooltip */}
        {hoveredZone && (
          <g className="map-tooltip" transform={`translate(${Math.min(tooltipPos.x, 530)}, ${Math.min(tooltipPos.y, 470)})`}>
            <rect
              x="0"
              y="-40"
              width="190"
              height="58"
              rx="8"
              fill="rgba(15,15,30,0.96)"
              stroke="#6c5ce7"
              strokeWidth="1"
            />
            <text x="12" y="-20" fill="#fff" fontSize="12" fontWeight="700">
              📍 {hoveredZone.label}
            </text>
            <text x="12" y="0" fill="#aaa" fontSize="9">
              {zoneCounts[hoveredZone.id]} total • {getZoneComplaints(hoveredZone).filter(c => c.status === 'Open').length} open • {getZoneComplaints(hoveredZone).filter(c => c.priority === 'High').length} urgent
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-title">Issue Density:</span>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#2ecc71' }}></span>
          <span>Clear</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#f1c40f' }}></span>
          <span>Low</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#e67e22' }}></span>
          <span>Moderate</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#e74c3c' }}></span>
          <span>High</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#c0392b' }}></span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}

export { CAMPUS_ZONES };
