import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiTrendingUp, FiStar, FiShield, FiTarget } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, getUserStats, getUserBadges, getUserRank, RANK_TIERS } from '../services/gamification';
import '../styles/leaderboard.css';

export default function Leaderboard() {
  const { user } = useAuth();

  const leaderboard = useMemo(() => getLeaderboard(), []);
  const myStats = useMemo(() => getUserStats(user.id, user.name), [user.id, user.name]);
  const myRank = useMemo(() => getUserRank(user.id, user.name), [user.id, user.name]);
  const myBadges = useMemo(() => getUserBadges(user.id, user.name), [user.id, user.name]);
  const myPosition = useMemo(() => {
    const idx = leaderboard.findIndex(e => e.userId === user.id);
    return idx >= 0 ? idx + 1 : leaderboard.length + 1;
  }, [leaderboard, user.id]);

  const nextRank = useMemo(() => {
    const currentIdx = RANK_TIERS.findIndex(t => t.name === myRank.name);
    return currentIdx < RANK_TIERS.length - 1 ? RANK_TIERS[currentIdx + 1] : null;
  }, [myRank]);

  const progressToNext = useMemo(() => {
    if (!nextRank) return 100;
    const currentMin = myRank.minPoints;
    const nextMin = nextRank.minPoints;
    return Math.min(100, ((myStats.totalPoints - currentMin) / (nextMin - currentMin)) * 100);
  }, [myStats, myRank, nextRank]);

  const getMedalEmoji = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  return (
    <motion.div
      className="leaderboard-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="lb-header">
        <h1><FiAward /> Leaderboard & Rewards</h1>
        <p>Earn points by reporting issues and helping improve our campus</p>
      </div>

      {/* My Stats Card */}
      <div className="my-stats-card">
        <div className="my-stats-left">
          <div className="my-rank-badge" style={{ borderColor: myRank.color }}>
            <span className="rank-icon">{myRank.icon}</span>
            <div>
              <span className="rank-name" style={{ color: myRank.color }}>{myRank.name}</span>
              <span className="rank-position">#{myPosition} on leaderboard</span>
            </div>
          </div>
          <div className="my-points-display">
            <span className="points-number">{myStats.totalPoints}</span>
            <span className="points-label">Total Points</span>
          </div>
        </div>
        <div className="my-stats-right">
          <div className="stat-mini">
            <FiTarget className="stat-mini-icon" />
            <span className="stat-mini-val">{myStats.complaintsSubmitted}</span>
            <span className="stat-mini-label">Reports</span>
          </div>
          <div className="stat-mini">
            <FiShield className="stat-mini-icon" />
            <span className="stat-mini-val">{myStats.complaintsResolved}</span>
            <span className="stat-mini-label">Resolved</span>
          </div>
          <div className="stat-mini">
            <FiStar className="stat-mini-icon" />
            <span className="stat-mini-val">{myStats.urgentReports}</span>
            <span className="stat-mini-label">Urgent</span>
          </div>
        </div>
      </div>

      {/* Progress to next rank */}
      {nextRank && (
        <div className="rank-progress-card">
          <div className="rank-progress-header">
            <span>{myRank.icon} {myRank.name}</span>
            <span className="rank-progress-pts">{myStats.totalPoints} / {nextRank.minPoints} pts</span>
            <span>{nextRank.icon} {nextRank.name}</span>
          </div>
          <div className="rank-progress-bar">
            <motion.div
              className="rank-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ background: `linear-gradient(90deg, ${myRank.color}, ${nextRank.color})` }}
            />
          </div>
        </div>
      )}

      <div className="lb-content">
        {/* Leaderboard Table */}
        <div className="lb-table-section">
          <h2><FiTrendingUp /> Top Contributors</h2>
          <div className="lb-table">
            <div className="lb-table-header">
              <span className="lb-col-rank">Rank</span>
              <span className="lb-col-name">Student</span>
              <span className="lb-col-pts">Points</span>
              <span className="lb-col-reports">Reports</span>
              <span className="lb-col-tier">Tier</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="lb-empty">No data yet. Be the first to earn points!</div>
            ) : (
              leaderboard.slice(0, 15).map((entry, idx) => (
                <motion.div
                  key={entry.userId}
                  className={`lb-row ${entry.userId === user.id ? 'lb-row-me' : ''} ${idx < 3 ? 'lb-row-top3' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <span className="lb-col-rank">
                    <span className={`medal medal-${idx + 1}`}>{getMedalEmoji(idx + 1)}</span>
                  </span>
                  <span className="lb-col-name">
                    <span className="lb-avatar">{entry.userName.charAt(0)}</span>
                    <span className="lb-name-text">
                      {entry.userName}
                      {entry.userId === user.id && <span className="lb-you-tag">YOU</span>}
                    </span>
                  </span>
                  <span className="lb-col-pts">
                    <strong>{entry.totalPoints}</strong> pts
                  </span>
                  <span className="lb-col-reports">{entry.complaintsSubmitted}</span>
                  <span className="lb-col-tier">
                    <span className="lb-tier-badge" style={{ color: entry.rank.color }}>
                      {entry.rank.icon} {entry.rank.name}
                    </span>
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Badges Section */}
        <div className="lb-badges-section">
          <h2><FiStar /> Your Badges</h2>
          <div className="badges-grid">
            {myBadges.map(badge => (
              <motion.div
                key={badge.id}
                className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
                whileHover={{ scale: 1.05 }}
              >
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
                <span className="badge-desc">{badge.description}</span>
                {!badge.earned && <span className="badge-lock">🔒</span>}
              </motion.div>
            ))}
          </div>

          {/* Points Guide */}
          <div className="points-guide">
            <h3>How to Earn Points</h3>
            <div className="guide-items">
              <div className="guide-item">
                <span className="guide-pts">+10</span>
                <span>Submit a complaint</span>
              </div>
              <div className="guide-item">
                <span className="guide-pts">+25</span>
                <span>Complaint resolved</span>
              </div>
              <div className="guide-item">
                <span className="guide-pts">+15</span>
                <span>Report urgent issue</span>
              </div>
              <div className="guide-item">
                <span className="guide-pts">+20</span>
                <span>First report bonus</span>
              </div>
              <div className="guide-item">
                <span className="guide-pts">+5</span>
                <span>Receive upvote</span>
              </div>
              <div className="guide-item">
                <span className="guide-pts">+2</span>
                <span>Upvote others</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
