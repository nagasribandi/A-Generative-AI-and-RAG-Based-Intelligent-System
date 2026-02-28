// =====================================================
// AI Classification Engine (Simulated GenAI + RAG)
// =====================================================

import { fbGetComplaints, fbCreateComplaint, fbUpdateComplaint } from './firebase';

// Category classification keywords
const CATEGORY_RULES = {
  'Infrastructure': ['building', 'wall', 'roof', 'ceiling', 'floor', 'door', 'window', 'crack', 'broken', 'damage', 'leak', 'repair', 'construction', 'paint', 'tile', 'stair', 'ramp', 'lift', 'elevator', 'parking'],
  'Electrical': ['light', 'electricity', 'power', 'fan', 'ac', 'air conditioning', 'switch', 'socket', 'wire', 'wiring', 'bulb', 'electrical', 'voltage', 'generator', 'outage', 'blackout', 'short circuit'],
  'Plumbing': ['water', 'pipe', 'tap', 'toilet', 'bathroom', 'washroom', 'drainage', 'sewage', 'leak', 'plumbing', 'basin', 'sink', 'shower', 'flush', 'clog', 'blocked drain'],
  'IT & Network': ['wifi', 'internet', 'network', 'computer', 'printer', 'projector', 'software', 'login', 'password', 'server', 'website', 'portal', 'lab', 'system', 'monitor', 'keyboard', 'mouse', 'lan'],
  'Cleanliness': ['clean', 'dirty', 'garbage', 'trash', 'waste', 'dustbin', 'sweeping', 'mop', 'hygiene', 'pest', 'cockroach', 'rat', 'insect', 'smell', 'odor', 'stain', 'litter'],
  'Safety & Security': ['security', 'guard', 'cctv', 'camera', 'theft', 'stolen', 'fire', 'extinguisher', 'emergency', 'safety', 'hazard', 'danger', 'alarm', 'lock', 'key', 'access', 'trespass'],
  'Furniture': ['chair', 'desk', 'table', 'bench', 'board', 'whiteboard', 'blackboard', 'cupboard', 'shelf', 'furniture', 'seat', 'podium', 'locker'],
  'Academic': ['class', 'lecture', 'professor', 'teacher', 'exam', 'grade', 'syllabus', 'schedule', 'timetable', 'attendance', 'assignment', 'course', 'faculty', 'lab session'],
  'Hostel': ['hostel', 'room', 'roommate', 'mess', 'food', 'canteen', 'laundry', 'warden', 'curfew', 'visitor', 'dormitory', 'bed', 'mattress'],
  'Transport': ['bus', 'transport', 'shuttle', 'route', 'driver', 'vehicle', 'parking', 'traffic', 'bicycle', 'bike']
};

// Priority rules
const HIGH_KEYWORDS = ['urgent', 'emergency', 'fire', 'danger', 'hazard', 'immediate', 'critical', 'severe',
  'flood', 'collapse', 'injury', 'broken glass', 'electrocution', 'short circuit', 'theft', 'stolen',
  'life threatening', 'unconscious', 'accident', 'explosion', 'gas leak', 'live wire', 'sparking',
  'attacked', 'assault', 'bleeding', 'trapped', 'stuck in elevator', 'smoke', 'toxic',
  'structural damage', 'ceiling fell', 'wall crack', 'sinkhole', 'electric shock'];
const MEDIUM_KEYWORDS = ['broken', 'not working', 'damaged', 'leaking', 'malfunction', 'faulty', 'intermittent',
  'slow', 'frequent', 'recurring', 'problem', 'issue', 'trouble', 'complaint', 'poor', 'bad',
  'fail', 'failed', 'failure', 'stuck', 'jammed', 'noisy', 'noise', 'vibration', 'flickering',
  'erratic', 'inconsistent', 'unreliable', 'defective', 'worn out', 'rusted', 'corroded',
  'cracked', 'chipped', 'peeling', 'stained', 'overflowing', 'clogged', 'blocked',
  'overcrowded', 'insufficient', 'inadequate', 'missing', 'absent', 'unavailable',
  'delayed', 'late', 'irregular', 'disruptive', 'affecting', 'hindering', 'preventing',
  'unable to', 'cannot', "doesn't work", 'does not work', 'stopped working', 'out of order',
  'need repair', 'needs fixing', 'please fix', 'help', 'seriously', 'very bad', 'terrible',
  'horrible', 'disgusting', 'unbearable', 'unacceptable', 'pathetic', 'worst',
  'since long', 'many days', 'weeks', 'no response', 'multiple times', 'again and again',
  'still not', 'yet to be', 'pending', 'ignored', 'no action', 'several complaints'];

// SOP Database for RAG
const SOP_DATABASE = {
  'Infrastructure': {
    sops: [
      'SOP-INF-001: Building Maintenance Protocol',
      'SOP-INF-002: Structural Damage Assessment Guide',
      'SOP-INF-003: Emergency Repair Procedures'
    ],
    actionPlan: [
      'Dispatch maintenance team to inspect the reported area within 2 hours',
      'Document damage with photographs and written assessment',
      'Classify severity: Minor (patch repair), Moderate (section repair), Major (structural intervention)',
      'If structural risk detected, cordon off the area immediately and notify safety officer',
      'Create work order with estimated timeline and resource requirements',
      'Assign to appropriate contractor or in-house maintenance crew',
      'Schedule follow-up inspection after repair completion',
      'Update facility maintenance log and notify complainant of resolution'
    ]
  },
  'Electrical': {
    sops: [
      'SOP-ELE-001: Electrical Fault Response Protocol',
      'SOP-ELE-002: Power Outage Management',
      'SOP-ELE-003: AC/HVAC Maintenance Schedule'
    ],
    actionPlan: [
      'Log the electrical complaint and verify location details',
      'Check if the issue affects a single unit or entire zone/building',
      'For safety hazards (exposed wires, sparking): immediately cut power to affected circuit',
      'Dispatch certified electrician within 1 hour for high-priority, 4 hours for standard',
      'Perform root cause analysis (overload, faulty wiring, equipment failure)',
      'Replace/repair faulty components following electrical safety codes',
      'Test the repair thoroughly before restoring service',
      'Document the fix in the electrical maintenance register'
    ]
  },
  'Plumbing': {
    sops: [
      'SOP-PLB-001: Water Leakage Response',
      'SOP-PLB-002: Drainage Blockage Resolution',
      'SOP-PLB-003: Water Supply Management'
    ],
    actionPlan: [
      'Acknowledge the plumbing complaint and locate the exact issue point',
      'For active leaks: shut off the nearest water valve to prevent further damage',
      'Dispatch plumbing team with appropriate tools and replacement parts',
      'Assess whether the issue is localized or part of a larger plumbing infrastructure problem',
      'Perform repair: pipe replacement, seal application, or drain clearing',
      'Test water flow and check for secondary damage (water damage to walls/floors)',
      'If recurrent issue, schedule comprehensive plumbing audit for the building',
      'Confirm resolution with complainant and update maintenance records'
    ]
  },
  'IT & Network': {
    sops: [
      'SOP-IT-001: Network Connectivity Troubleshooting',
      'SOP-IT-002: Hardware Repair/Replacement Protocol',
      'SOP-IT-003: Software & Account Management'
    ],
    actionPlan: [
      'Log the IT issue with device/system details and user information',
      'Perform initial remote diagnosis (ping test, connectivity check, system logs)',
      'For network issues: check router/switch status, verify DHCP/DNS configuration',
      'For hardware: dispatch IT technician to inspect and diagnose on-site',
      'If equipment replacement needed, process through IT asset management system',
      'For software issues: check for updates, reinstall, or escalate to vendor support',
      'Test the solution and confirm service restoration',
      'Update IT asset registry and close the ticket with resolution notes'
    ]
  },
  'Cleanliness': {
    sops: [
      'SOP-CLN-001: Routine Cleaning Schedule',
      'SOP-CLN-002: Special Cleaning Request Protocol',
      'SOP-CLN-003: Pest Control Management'
    ],
    actionPlan: [
      'Acknowledge cleanliness complaint and identify specific location and issue type',
      'Dispatch housekeeping staff to the reported area within 30 minutes',
      'For pest issues: contact authorized pest control vendor for assessment',
      'Perform thorough cleaning/sanitization of the affected area',
      'Place appropriate signage during and after cleaning',
      'Review cleaning schedule for the area and adjust frequency if needed',
      'For recurring issues: conduct root cause analysis (waste management, drainage, etc.)',
      'Verify cleanliness standards are met and notify complainant'
    ]
  },
  'Safety & Security': {
    sops: [
      'SOP-SEC-001: Emergency Response Protocol',
      'SOP-SEC-002: Theft/Loss Report Procedure',
      'SOP-SEC-003: CCTV & Access Control Management'
    ],
    actionPlan: [
      'IMMEDIATE: Assess threat level and activate appropriate emergency protocol if needed',
      'For active emergencies: contact campus security control room and local authorities',
      'Secure the affected area and ensure safety of all personnel',
      'For theft: preserve evidence, review CCTV footage, file official report',
      'For fire safety: inspect fire extinguishers, alarms, and evacuation routes',
      'Deploy additional security personnel to the area if needed',
      'Conduct incident investigation and prepare detailed report',
      'Implement preventive measures and update security protocols as needed'
    ]
  },
  'Furniture': {
    sops: [
      'SOP-FUR-001: Furniture Repair/Replacement Protocol',
      'SOP-FUR-002: Classroom Equipment Maintenance'
    ],
    actionPlan: [
      'Log the furniture complaint with location and item details',
      'Inspect the furniture item to determine if repair or replacement is needed',
      'For repairable items: send to maintenance workshop with work order',
      'For replacement: process requisition through procurement department',
      'Provide temporary alternative seating/furniture if available',
      'Install repaired/new furniture and remove damaged items',
      'Update furniture inventory register',
      'Confirm resolution with the complainant'
    ]
  },
  'Academic': {
    sops: [
      'SOP-ACD-001: Academic Complaint Resolution',
      'SOP-ACD-002: Faculty/Course Issue Escalation'
    ],
    actionPlan: [
      'Register the academic complaint and assign a case reference number',
      'Forward to the relevant department head or academic coordinator',
      'Schedule a meeting with the student to understand the concern in detail',
      'Review relevant academic records, schedules, or policies',
      'Mediate between student and faculty if needed',
      'Propose a resolution in accordance with academic regulations',
      'Implement the agreed-upon resolution and document the outcome',
      'Follow up with the student within one week to ensure satisfaction'
    ]
  },
  'Hostel': {
    sops: [
      'SOP-HST-001: Hostel Facility Maintenance',
      'SOP-HST-002: Mess/Food Quality Management',
      'SOP-HST-003: Hostel Discipline & Welfare'
    ],
    actionPlan: [
      'Acknowledge the hostel complaint and verify student residence details',
      'For facility issues: dispatch hostel maintenance team for inspection',
      'For food/mess complaints: notify mess committee and kitchen supervisor',
      'For roommate/discipline issues: arrange meeting with hostel warden',
      'Implement immediate corrective action where possible',
      'For recurring issues: escalate to hostel administration committee',
      'Document resolution and preventive measures taken',
      'Follow up with resident student within 48 hours'
    ]
  },
  'Transport': {
    sops: [
      'SOP-TRN-001: Transport Service Complaint Handling',
      'SOP-TRN-002: Route & Schedule Management'
    ],
    actionPlan: [
      'Log the transport complaint with route, time, and specific issue details',
      'Contact transport supervisor to verify and investigate the complaint',
      'For vehicle condition issues: schedule immediate vehicle inspection',
      'For route/timing issues: review and optimize the route/schedule',
      'For driver behavior: initiate disciplinary review process',
      'Implement corrective measures and inform all affected commuters',
      'Monitor the route/service for improvements over the next week',
      'Update complainant on actions taken and resolution status'
    ]
  }
};

export function classifyComplaint(text) {
  const lower = text.toLowerCase();
  let bestCategory = 'Infrastructure';
  let bestScore = 0;
  const allScores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += keyword.split(' ').length;
      }
    }
    allScores[category] = score;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Improved confidence formula with specificity and text length
  const sortedScores = Object.values(allScores).sort((a, b) => b - a);
  const secondBest = sortedScores[1] || 0;
  const gap = bestScore - secondBest;

  let confidence;
  if (bestScore === 0) {
    confidence = 55;
  } else {
    const keywordContrib = Math.min(20, bestScore * 5);
    const specificityBonus = Math.min(10, gap * 4);
    const textLengthBonus = Math.min(5, Math.floor(text.split(' ').length / 10));
    confidence = Math.min(96, 62 + keywordContrib + specificityBonus + textLengthBonus);
  }

  return { category: bestCategory, confidence };
}

export function predictPriority(text) {
  const lower = text.toLowerCase();
  
  const highMatches = HIGH_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (highMatches > 0) return { level: 'High', color: '#ef4444' };

  const mediumMatches = MEDIUM_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (mediumMatches > 0) return { level: 'Medium', color: '#f59e0b' };

  // Contextual signals
  const wordCount = text.split(' ').length;
  const hasExclamation = text.includes('!');
  const negativeWords = ['not', 'no', 'never', 'nothing', "don't", "doesn't", "won't", "can't", "couldn't", "isn't", "aren't"];
  const hasNegative = negativeWords.some(w => lower.includes(w));
  const complaintWords = ['need', 'want', 'require', 'request', 'fix', 'resolve', 'address', 'attend', 'look into', 'kindly', 'please', 'asap', 'soon', 'quickly'];
  const hasComplaint = complaintWords.some(w => lower.includes(w));

  if (wordCount >= 8 && (hasNegative || hasComplaint)) return { level: 'Medium', color: '#f59e0b' };
  if (hasExclamation && wordCount >= 5) return { level: 'Medium', color: '#f59e0b' };

  return { level: 'Low', color: '#22c55e' };
}

export function generateRAGResponse(category) {
  const data = SOP_DATABASE[category] || SOP_DATABASE['Infrastructure'];
  return {
    sops: data.sops,
    actionPlan: data.actionPlan,
    generatedSummary: `Based on the complaint classified under "${category}", the system has retrieved ${data.sops.length} relevant Standard Operating Procedures and generated a ${data.actionPlan.length}-step action plan. The resolution follows established campus maintenance protocols and best practices for ${category.toLowerCase()} management.`
  };
}

export function generateAISummary(text, category, priority) {
  const summaries = {
    'High': `⚠️ URGENT: This ${category.toLowerCase()} issue requires immediate attention. The complaint indicates a potentially serious problem that could affect campus safety or operations. Priority dispatch has been recommended.`,
    'Medium': `📋 This ${category.toLowerCase()} complaint requires standard response. The issue has been identified as a recurring or notable problem that should be addressed within the standard service window to prevent escalation.`,
    'Low': `ℹ️ This ${category.toLowerCase()} matter has been logged for routine handling. The complaint describes a minor issue that can be scheduled for the next maintenance cycle without immediate impact on campus operations.`
  };
  return summaries[priority] || summaries['Low'];
}

// Complaint storage — Firebase backed

export async function getComplaints() {
  const complaints = await fbGetComplaints();
  return complaints;
}

export async function saveComplaint(complaint) {
  await fbCreateComplaint(complaint);
  return complaint;
}

export async function updateComplaint(id, updates) {
  await fbUpdateComplaint(id, updates);
  const complaints = await fbGetComplaints();
  return complaints.find(c => c.id === id) || null;
}
