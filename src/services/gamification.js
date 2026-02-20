// =====================================================
// Gamification Engine — Points, Badges & Leaderboard
// =====================================================

const POINTS_KEY = 'smart_campus_points';

// Point values for different actions
const POINT_VALUES = {
  SUBMIT_COMPLAINT: 10,
  COMPLAINT_RESOLVED: 25,
  HIGH_PRIORITY_REPORT: 15,
  FIRST_COMPLAINT: 20,
  STREAK_BONUS: 5,        // bonus per consecutive day active
  UPVOTE_GIVEN: 2,
  UPVOTE_RECEIVED: 5
};

// Badge definitions
const BADGE_DEFINITIONS = [
  { id: 'first-report', name: 'First Report', icon: '🎯', description: 'Submitted your first complaint', requirement: 1, type: 'complaints' },
  { id: 'reporter-5', name: 'Active Reporter', icon: '📝', description: 'Submitted 5 complaints', requirement: 5, type: 'complaints' },
  { id: 'reporter-10', name: 'Campus Guardian', icon: '🛡️', description: 'Submitted 10 complaints', requirement: 10, type: 'complaints' },
  { id: 'reporter-25', name: 'Watchdog', icon: '🐕', description: 'Submitted 25 complaints', requirement: 25, type: 'complaints' },
  { id: 'points-50', name: 'Rising Star', icon: '⭐', description: 'Earned 50 points', requirement: 50, type: 'points' },
  { id: 'points-100', name: 'Problem Solver', icon: '🏆', description: 'Earned 100 points', requirement: 100, type: 'points' },
  { id: 'points-250', name: 'Campus Hero', icon: '🦸', description: 'Earned 250 points', requirement: 250, type: 'points' },
  { id: 'points-500', name: 'Legend', icon: '👑', description: 'Earned 500 points', requirement: 500, type: 'points' },
  { id: 'resolved-1', name: 'Problem Fixed', icon: '✅', description: 'Got 1 complaint resolved', requirement: 1, type: 'resolved' },
  { id: 'resolved-5', name: 'Fixer', icon: '🔧', description: 'Got 5 complaints resolved', requirement: 5, type: 'resolved' },
  { id: 'urgent-1', name: 'Alert Eagle', icon: '🦅', description: 'Reported 1 high priority issue', requirement: 1, type: 'urgent' }
];

// Rank tiers
const RANK_TIERS = [
  { name: 'Newcomer', minPoints: 0, icon: '🌱', color: '#95a5a6' },
  { name: 'Reporter', minPoints: 25, icon: '📋', color: '#3498db' },
  { name: 'Contributor', minPoints: 75, icon: '⚡', color: '#2ecc71' },
  { name: 'Guardian', minPoints: 150, icon: '🛡️', color: '#9b59b6' },
  { name: 'Champion', minPoints: 300, icon: '🏆', color: '#f39c12' },
  { name: 'Legend', minPoints: 500, icon: '👑', color: '#e74c3c' }
];

// Get all user points data
function getPointsData() {
  const stored = localStorage.getItem(POINTS_KEY);
  if (stored) return JSON.parse(stored);
  return {};
}

function savePointsData(data) {
  localStorage.setItem(POINTS_KEY, JSON.stringify(data));
}

// Get user points entry (creates if not exists)
function getUserPointsEntry(userId, userName) {
  const data = getPointsData();
  if (!data[userId]) {
    data[userId] = {
      userId,
      userName: userName || 'Unknown',
      totalPoints: 0,
      complaintsSubmitted: 0,
      complaintsResolved: 0,
      urgentReports: 0,
      upvotesGiven: 0,
      upvotesReceived: 0,
      history: [],
      badges: [],
      lastActive: new Date().toISOString()
    };
    savePointsData(data);
  }
  // Update name if changed
  if (userName && data[userId].userName !== userName) {
    data[userId].userName = userName;
    savePointsData(data);
  }
  return data[userId];
}

// Award points to a user
export function awardPoints(userId, userName, action, details) {
  const data = getPointsData();
  const entry = getUserPointsEntry(userId, userName);

  let points = 0;
  let actionLabel = '';

  switch (action) {
    case 'SUBMIT_COMPLAINT':
      points = POINT_VALUES.SUBMIT_COMPLAINT;
      actionLabel = 'Submitted a complaint';
      entry.complaintsSubmitted += 1;
      // First complaint bonus
      if (entry.complaintsSubmitted === 1) {
        points += POINT_VALUES.FIRST_COMPLAINT;
        actionLabel += ' (First Report Bonus!)';
      }
      break;
    case 'COMPLAINT_RESOLVED':
      points = POINT_VALUES.COMPLAINT_RESOLVED;
      actionLabel = 'Complaint was resolved';
      entry.complaintsResolved += 1;
      break;
    case 'HIGH_PRIORITY_REPORT':
      points = POINT_VALUES.HIGH_PRIORITY_REPORT;
      actionLabel = 'Reported a high priority issue';
      entry.urgentReports += 1;
      break;
    case 'UPVOTE_GIVEN':
      points = POINT_VALUES.UPVOTE_GIVEN;
      actionLabel = 'Upvoted a complaint';
      entry.upvotesGiven += 1;
      break;
    case 'UPVOTE_RECEIVED':
      points = POINT_VALUES.UPVOTE_RECEIVED;
      actionLabel = 'Received an upvote';
      entry.upvotesReceived += 1;
      break;
    default:
      points = 5;
      actionLabel = action;
  }

  entry.totalPoints += points;
  entry.lastActive = new Date().toISOString();
  entry.history.unshift({
    action: actionLabel,
    points,
    details: details || '',
    timestamp: new Date().toISOString()
  });

  // Keep only last 50 history entries
  if (entry.history.length > 50) {
    entry.history = entry.history.slice(0, 50);
  }

  // Check & award badges
  const newBadges = checkBadges(entry);

  data[userId] = entry;
  savePointsData(data);

  return { points, totalPoints: entry.totalPoints, newBadges };
}

// Check and award badges
function checkBadges(entry) {
  const newBadges = [];

  BADGE_DEFINITIONS.forEach(badge => {
    if (entry.badges.includes(badge.id)) return;

    let earned = false;
    switch (badge.type) {
      case 'complaints':
        earned = entry.complaintsSubmitted >= badge.requirement;
        break;
      case 'points':
        earned = entry.totalPoints >= badge.requirement;
        break;
      case 'resolved':
        earned = entry.complaintsResolved >= badge.requirement;
        break;
      case 'urgent':
        earned = entry.urgentReports >= badge.requirement;
        break;
      default:
        break;
    }

    if (earned) {
      entry.badges.push(badge.id);
      newBadges.push(badge);
    }
  });

  return newBadges;
}

// Get user stats
export function getUserStats(userId, userName) {
  return getUserPointsEntry(userId, userName);
}

// Get user rank
export function getUserRank(userId, userName) {
  const entry = getUserPointsEntry(userId, userName);
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (entry.totalPoints >= tier.minPoints) {
      rank = tier;
    }
  }
  return rank;
}

// Get user badges (detailed)
export function getUserBadges(userId, userName) {
  const entry = getUserPointsEntry(userId, userName);
  return BADGE_DEFINITIONS.map(badge => ({
    ...badge,
    earned: entry.badges.includes(badge.id)
  }));
}

// Get leaderboard
export function getLeaderboard() {
  const data = getPointsData();
  const entries = Object.values(data)
    .filter(e => e.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return entries.map((entry, index) => {
    let rank = RANK_TIERS[0];
    for (const tier of RANK_TIERS) {
      if (entry.totalPoints >= tier.minPoints) rank = tier;
    }
    return {
      position: index + 1,
      ...entry,
      rank
    };
  });
}

// Seed some sample leaderboard data
export function seedSampleLeaderboard() {
  const data = getPointsData();
  if (Object.keys(data).length > 1) return; // Already seeded

  const sampleUsers = [
    { id: 'sample-1', name: 'Rahul Sharma', points: 185, complaints: 12, resolved: 5, urgent: 2 },
    { id: 'sample-2', name: 'Priya Patel', points: 140, complaints: 9, resolved: 3, urgent: 1 },
    { id: 'sample-3', name: 'Amit Kumar', points: 95, complaints: 6, resolved: 2, urgent: 1 },
    { id: 'sample-4', name: 'Sneha Reddy', points: 75, complaints: 5, resolved: 1, urgent: 0 },
    { id: 'sample-5', name: 'Karthik Nair', points: 60, complaints: 4, resolved: 1, urgent: 1 },
    { id: 'sample-6', name: 'Divya Iyer', points: 45, complaints: 3, resolved: 0, urgent: 0 },
    { id: 'sample-7', name: 'Ravi Verma', points: 30, complaints: 2, resolved: 0, urgent: 0 }
  ];

  sampleUsers.forEach(u => {
    data[u.id] = {
      userId: u.id,
      userName: u.name,
      totalPoints: u.points,
      complaintsSubmitted: u.complaints,
      complaintsResolved: u.resolved,
      urgentReports: u.urgent,
      upvotesGiven: 0,
      upvotesReceived: 0,
      history: [],
      badges: [],
      lastActive: new Date().toISOString()
    };
    // Award badges
    checkBadges(data[u.id]);
  });

  savePointsData(data);
}

export { BADGE_DEFINITIONS, RANK_TIERS, POINT_VALUES };
