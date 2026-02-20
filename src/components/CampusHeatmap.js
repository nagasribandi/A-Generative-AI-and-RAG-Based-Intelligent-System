import React, { useState, useMemo } from 'react';

// Zone definitions: each zone has a unique id, label, SVG path, and matches location strings
const CAMPUS_ZONES = [
  {
    id: 'main-building',
    label: 'Main Building',
    matchPatterns: ['Main Building'],
    path: 'M 60 160 L 220 160 L 220 280 L 60 280 Z',
    labelPos: { x: 140, y: 220 }
  },
  {
    id: 'science-block',
    label: 'Science Block',
    matchPatterns: ['Science Block'],
    path: 'M 240 160 L 380 160 L 380 280 L 240 280 Z',
    labelPos: { x: 310, y: 220 }
  },
  {
    id: 'it-block',
    label: 'IT Block',
    matchPatterns: ['IT Block'],
    path: 'M 400 160 L 540 160 L 540 280 L 400 280 Z',
    labelPos: { x: 470, y: 220 }
  },
  {
    id: 'arts-block',
    label: 'Arts Block',
    matchPatterns: ['Arts Block', 'Block C'],
    path: 'M 560 160 L 700 160 L 700 280 L 560 280 Z',
    labelPos: { x: 630, y: 220 }
  },
  {
    id: 'library',
    label: 'Library',
    matchPatterns: ['Library'],
    path: 'M 60 310 L 180 310 L 180 410 L 60 410 Z',
    labelPos: { x: 120, y: 360 }
  },
  {
    id: 'auditorium',
    label: 'Auditorium',
    matchPatterns: ['Auditorium'],
    path: 'M 200 310 L 340 310 L 340 410 L 200 410 Z',
    labelPos: { x: 270, y: 360 }
  },
  {
    id: 'cafeteria',
    label: 'Cafeteria',
    matchPatterns: ['Cafeteria', 'Canteen'],
    path: 'M 360 310 L 480 310 L 480 410 L 360 410 Z',
    labelPos: { x: 420, y: 360 }
  },
  {
    id: 'sports-complex',
    label: 'Sports Complex',
    matchPatterns: ['Sports Complex'],
    path: 'M 500 310 L 700 310 L 700 410 L 500 410 Z',
    labelPos: { x: 600, y: 360 }
  },
  {
    id: 'boys-hostel',
    label: 'Boys Hostel',
    matchPatterns: ['Boys Hostel'],
    path: 'M 60 440 L 220 440 L 220 550 L 60 550 Z',
    labelPos: { x: 140, y: 495 }
  },
  {
    id: 'girls-hostel',
    label: 'Girls Hostel',
    matchPatterns: ['Girls Hostel'],
    path: 'M 240 440 L 400 440 L 400 550 L 240 550 Z',
    labelPos: { x: 320, y: 495 }
  },
  {
    id: 'parking-area',
    label: 'Parking Area',
    matchPatterns: ['Parking Area'],
    path: 'M 420 440 L 560 440 L 560 550 L 420 550 Z',
    labelPos: { x: 490, y: 495 }
  },
  {
    id: 'campus-grounds',
    label: 'Campus Grounds',
    matchPatterns: ['Campus Grounds', 'Other'],
    path: 'M 580 440 L 700 440 L 700 550 L 580 550 Z',
    labelPos: { x: 640, y: 495 }
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
        viewBox="0 0 760 600"
        className="campus-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect x="0" y="0" width="760" height="600" rx="16" fill="#1a1a2e" />

        {/* Title */}
        <text x="380" y="40" textAnchor="middle" className="map-title" fill="#e0e0e0" fontSize="20" fontWeight="700">
          🏫 Vardhaman Campus Map
        </text>

        {/* Road lines */}
        <line x1="30" y1="145" x2="730" y2="145" stroke="#2d2d4a" strokeWidth="3" strokeDasharray="10,5" />
        <line x1="30" y1="295" x2="730" y2="295" stroke="#2d2d4a" strokeWidth="3" strokeDasharray="10,5" />
        <line x1="30" y1="425" x2="730" y2="425" stroke="#2d2d4a" strokeWidth="3" strokeDasharray="10,5" />
        <line x1="30" y1="565" x2="730" y2="565" stroke="#2d2d4a" strokeWidth="3" strokeDasharray="10,5" />

        {/* Row labels */}
        <text x="380" y="80" textAnchor="middle" fill="#8888aa" fontSize="11" fontWeight="600" letterSpacing="3">
          — ACADEMIC ZONE —
        </text>
        <text x="270" y="130" textAnchor="middle" fill="#666688" fontSize="9">
          Main Road
        </text>

        {/* Zone entrance marker */}
        <text x="380" y="580" textAnchor="middle" fill="#8888aa" fontSize="11" fontWeight="600" letterSpacing="3">
          🚪 CAMPUS ENTRANCE
        </text>

        {/* Trees / decoration along roads */}
        {[100, 250, 400, 550, 680].map((x, i) => (
          <text key={`tree-${i}`} x={x} y="140" fontSize="12" textAnchor="middle" fill="#4a7">🌳</text>
        ))}
        {[100, 250, 400, 550, 680].map((x, i) => (
          <text key={`tree2-${i}`} x={x} y="422" fontSize="12" textAnchor="middle" fill="#4a7">🌳</text>
        ))}

        {/* Zone shapes */}
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
              {/* Shadow */}
              <path
                d={zone.path}
                fill="rgba(0,0,0,0.3)"
                transform="translate(3, 3)"
                rx="8"
              />
              {/* Zone body */}
              <path
                d={zone.path}
                fill={color.fill}
                stroke={isSelected ? '#fff' : color.stroke}
                strokeWidth={isSelected ? 3 : 1.5}
                opacity={isHovered ? 1 : 0.85}
                rx="8"
                className="zone-path"
              />
              {/* Zone label */}
              <text
                x={zone.labelPos.x}
                y={zone.labelPos.y - 10}
                textAnchor="middle"
                fill="#fff"
                fontSize="12"
                fontWeight="700"
                className="zone-label"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
              >
                {zone.label}
              </text>
              {/* Count badge */}
              <text
                x={zone.labelPos.x}
                y={zone.labelPos.y + 10}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="600"
                opacity="0.9"
              >
                {count} complaint{count !== 1 ? 's' : ''}
              </text>
              {/* Open issues warning */}
              {openCount > 0 && (
                <text
                  x={zone.labelPos.x}
                  y={zone.labelPos.y + 26}
                  textAnchor="middle"
                  fill="#ffe082"
                  fontSize="9"
                  fontWeight="600"
                >
                  ⚠ {openCount} open
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredZone && (
          <g className="map-tooltip" transform={`translate(${tooltipPos.x}, ${tooltipPos.y})`}>
            <rect
              x="0"
              y="-35"
              width="180"
              height="55"
              rx="8"
              fill="rgba(20,20,40,0.95)"
              stroke="#555"
              strokeWidth="1"
            />
            <text x="10" y="-15" fill="#fff" fontSize="12" fontWeight="700">
              {hoveredZone.label}
            </text>
            <text x="10" y="5" fill="#aaa" fontSize="10">
              {zoneCounts[hoveredZone.id]} total • {getZoneComplaints(hoveredZone).filter(c => c.status === 'Open').length} open • {getZoneComplaints(hoveredZone).filter(c => c.priority === 'High').length} high priority
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="legend-title">Density:</span>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#2ecc71' }}></span>
          <span>None</span>
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
