import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend, FiCpu, FiMinimize2, FiZap } from 'react-icons/fi';
import { classifyComplaint, predictPriority, getComplaints } from '../services/aiEngine';
import { pyGeminiChat, pyClassifyComplaint, pyPredictPriority } from '../services/pythonAiService';
import '../styles/chatbot.css';

// Knowledge base for FAQ and campus info
const FAQ_KNOWLEDGE = [
  { patterns: ['how.*submit', 'file.*complaint', 'report.*issue', 'new complaint', 'raise.*complaint'],
    response: 'To submit a complaint:\n1️⃣ Click "Submit Complaint" in the sidebar\n2️⃣ Enter a title and detailed description\n3️⃣ Select the location from the dropdown\n4️⃣ Click "Analyze with AI" to auto-classify\n5️⃣ Review the AI analysis and click Submit!\n\nWant me to take you there? Just say "go to submit".' },
  { patterns: ['track.*complaint', 'check.*status', 'my complaint', 'complaint status', 'where.*complaint'],
    response: 'You can track your complaints by:\n📋 Going to "Complaints" in the sidebar to see all your submissions\n🔍 Click on any complaint to see full details, AI analysis, and status updates\n📊 The Dashboard also shows your recent complaints at a glance.' },
  { patterns: ['heatmap', 'campus map', 'zone', 'which.*area', 'hotspot'],
    response: '🗺️ The Campus Heatmap shows complaint density across all campus zones. Colors indicate severity:\n🟢 Green = No issues\n🟡 Yellow = Low\n🟠 Orange = Moderate\n🔴 Red = High\n\nClick any zone to see detailed complaints for that area!' },
  { patterns: ['leaderboard', 'points', 'rewards', 'badges', 'gamification', 'rank'],
    response: '🏆 You earn points by:\n• +10 pts for submitting complaints\n• +25 pts when resolved\n• +15 pts for urgent reports\n• +20 bonus for your first report!\n\nCheck the Leaderboard page to see your rank and badges!' },
  { patterns: ['admin', 'contact.*admin', 'talk.*admin', 'escalate'],
    response: '🛡️ Admin Contact:\nUrgent complaints (High priority) automatically trigger email notifications to admins. For other inquiries, visit the college administration office at Block 1, Ground Floor.' },
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    response: 'Hello! 👋 I\'m the SmartCampus AI Assistant. I can help you with:\n🔹 Filing complaints\n🔹 Checking campus issues\n🔹 Answering FAQs\n🔹 Navigating the system\n\nWhat would you like to know?' },
  { patterns: ['thank', 'thanks', 'thx', 'appreciate'],
    response: 'You\'re welcome! 😊 Happy to help. Feel free to ask me anything else about the campus system!' },
  { patterns: ['help', 'what.*can.*do', 'features', 'options'],
    response: 'Here\'s what I can do for you:\n🤖 **Analyze Issues** — Describe a problem and I\'ll classify it\n📋 **File Complaints** — I\'ll guide you through the process\n🗺️ **Campus Info** — Ask about any zone or area\n📊 **Statistics** — I can tell you about current complaints\n🏆 **Rewards** — Check your points and badges\n💡 **FAQ** — Ask any question about the system!' },
  { patterns: ['category', 'categories', 'types.*complaint', 'what.*types'],
    response: 'We handle 10 complaint categories:\n🏗️ Infrastructure | ⚡ Electrical | 🔧 Plumbing\n💻 IT & Network | 🧹 Cleanliness | 🔒 Safety\n🪑 Furniture | 📚 Academic | 🏠 Hostel | 🚌 Transport\n\nOur AI automatically classifies your complaints!' }
];

// Smart response generator
function generateResponse(input, complaints) {
  const lower = input.toLowerCase().trim();

  // Check FAQ patterns
  for (const faq of FAQ_KNOWLEDGE) {
    for (const pattern of faq.patterns) {
      if (new RegExp(pattern, 'i').test(lower)) {
        return { type: 'faq', text: faq.response };
      }
    }
  }

  // Navigation requests
  if (/go.*to.*submit|take.*submit|open.*submit/i.test(lower)) {
    return { type: 'navigate', text: 'Taking you to the complaint form! 🚀', path: '/submit-complaint' };
  }
  if (/go.*to.*dashboard|open.*dashboard/i.test(lower)) {
    return { type: 'navigate', text: 'Opening Dashboard! 📊', path: '/dashboard' };
  }
  if (/go.*to.*heatmap|open.*map|show.*map/i.test(lower)) {
    return { type: 'navigate', text: 'Opening Campus Heatmap! 🗺️', path: '/heatmap' };
  }
  if (/go.*to.*leader|open.*leader|show.*leader/i.test(lower)) {
    return { type: 'navigate', text: 'Opening Leaderboard! 🏆', path: '/leaderboard' };
  }
  if (/go.*to.*complaint|show.*complaint|my.*complaint/i.test(lower)) {
    return { type: 'navigate', text: 'Opening Complaints! 📋', path: '/complaints' };
  }

  // Stats requests
  if (/how many.*complaint|total.*complaint|stats|statistics/i.test(lower)) {
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'Open').length;
    const inProgress = complaints.filter(c => c.status === 'In Progress').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    return {
      type: 'stats',
      text: `📊 Current Campus Statistics:\n• Total: ${total} complaints\n• 🔴 Open: ${open}\n• 🟡 In Progress: ${inProgress}\n• 🟢 Resolved: ${resolved}\n\nThe system is actively tracking all issues!`
    };
  }

  // AI Analysis — if it looks like a complaint description
  if (lower.length > 15 && /broken|not working|damage|leak|dirty|slow|problem|issue|faulty|crack|noise|smell|danger|fire|theft|stolen/i.test(lower)) {
    const classification = classifyComplaint(lower);
    const priority = predictPriority(lower);
    return {
      type: 'analysis',
      text: `🤖 **AI Analysis of your issue:**\n\n📂 Category: **${classification.category}** (${classification.confidence}% confident)\n⚡ Priority: **${priority.level}**\n\n💡 Want to file this as a complaint? Click "Submit Complaint" in the sidebar and paste your description — the AI will auto-fill the rest!`,
      analysis: { category: classification.category, confidence: classification.confidence, priority: priority.level }
    };
  }

  // Default fallback
  return {
    type: 'fallback',
    text: `I'm not sure I understood that. Try asking me about:\n🔹 "How to submit a complaint"\n🔹 "Show campus statistics"\n🔹 "What are the complaint categories"\n🔹 "Go to heatmap"\n🔹 Or describe an issue and I'll analyze it!\n\nYou can also just describe a problem like "the fan in Block 1 is broken" and I'll classify it.`
  };
}

export default function AIChatbot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! 👋 I\'m the SmartCampus AI Assistant powered by **Python AI Backend**. I can have intelligent conversations, analyze campus issues, and help you navigate the system!\n\nTry asking me anything about the campus!',
      type: 'greeting',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: input.trim(),
      time: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const complaints = await getComplaints();
    
    // First check for navigation commands (handle locally, no need for AI)
    const lower = userMsg.text.toLowerCase();
    const navPatterns = [
      { pattern: /go.*to.*submit|take.*submit|open.*submit/i, path: '/submit-complaint', text: 'Taking you to the complaint form! 🚀' },
      { pattern: /go.*to.*dashboard|open.*dashboard/i, path: '/dashboard', text: 'Opening Dashboard! 📊' },
      { pattern: /go.*to.*heatmap|open.*map|show.*map/i, path: '/heatmap', text: 'Opening Campus Heatmap! 🗺️' },
      { pattern: /go.*to.*leader|open.*leader|show.*leader/i, path: '/leaderboard', text: 'Opening Leaderboard! 🏆' },
      { pattern: /go.*to.*complaint|show.*complaint|my.*complaint/i, path: '/complaints', text: 'Opening Complaints! 📋' }
    ];

    let response = null;
    for (const nav of navPatterns) {
      if (nav.pattern.test(lower)) {
        response = { type: 'navigate', text: nav.text, path: nav.path };
        break;
      }
    }

    if (!response) {
      // Try Python AI backend for intelligent response
      try {
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const stats = {
          total: complaints.length,
          open: complaints.filter(c => c.status === 'Open').length,
          inProgress: complaints.filter(c => c.status === 'In Progress').length,
          resolved: complaints.filter(c => c.status === 'Resolved').length
        };

        const chatResult = await pyGeminiChat(userMsg.text, messages.slice(-8), stats);
        response = { type: 'gemini', text: chatResult.text };
        
        // If the response mentions analyzing a complaint, add analysis metadata
        if (lower.length > 15 && /broken|not working|damage|leak|dirty|slow|problem|issue|faulty|crack|noise|smell|danger|fire|theft/i.test(lower)) {
          try {
            const classification = await pyClassifyComplaint(lower);
            const priority = await pyPredictPriority(lower);
            response.analysis = { 
              category: classification.category, 
              confidence: classification.confidence, 
              priority: priority.level 
            };
          } catch (analysisErr) {
            // Use local fallback for analysis metadata
            const classification = classifyComplaint(lower);
            const priority = predictPriority(lower);
            response.analysis = { 
              category: classification.category, 
              confidence: classification.confidence, 
              priority: priority.level 
            };
          }
        }
      } catch (err) {
        console.warn('Python AI chatbot fallback:', err.message);
        // Fall back to local rule-based
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
        response = generateResponse(userMsg.text, complaints);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const botMsg = {
      id: Date.now() + 1,
      sender: 'bot',
      text: response.text,
      type: response.type,
      analysis: response.analysis || null,
      time: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);

    // Handle navigation
    if (response.type === 'navigate' && response.path) {
      setTimeout(() => navigate(response.path), 1200);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '📋 Submit Complaint', msg: 'How do I submit a complaint?' },
    { label: '📊 Campus Stats', msg: 'Show campus statistics' },
    { label: '🗺️ Heatmap', msg: 'Go to heatmap' },
    { label: '🏆 Leaderboard', msg: 'Go to leaderboard' }
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="chatbot-fab"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiMessageCircle />
            <span className="fab-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-header-info">
                <div className="chatbot-avatar">
                  <FiZap />
                </div>
                <div>
                  <span className="chatbot-name">AI Assistant</span>
                  <span className="chatbot-status">
                    <span className="status-dot" /> Python AI
                  </span>
                </div>
              </div>
              <div className="chatbot-header-actions">
                <button onClick={() => setIsMinimized(!isMinimized)}>
                  <FiMinimize2 />
                </button>
                <button onClick={() => setIsOpen(false)}>
                  <FiX />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="chatbot-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                      {msg.sender === 'bot' && (
                        <div className="chat-msg-avatar"><FiCpu /></div>
                      )}
                      <div className="chat-msg-bubble">
                        <div className="chat-msg-text">
                          {msg.text.split('\n').map((line, i) => (
                            <span key={i}>
                              {line.replace(/\*\*(.*?)\*\*/g, '«$1»').split('«').map((part, j) => {
                                if (part.includes('»')) {
                                  const [bold, rest] = part.split('»');
                                  return <span key={j}><strong>{bold}</strong>{rest}</span>;
                                }
                                return part;
                              })}
                              {i < msg.text.split('\n').length - 1 && <br />}
                            </span>
                          ))}
                        </div>
                        {msg.analysis && (
                          <div className="chat-analysis-badge">
                            <span className={`analysis-priority priority-${msg.analysis.priority.toLowerCase()}`}>
                              {msg.analysis.priority}
                            </span>
                            <span className="analysis-category">{msg.analysis.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="chat-msg bot">
                      <div className="chat-msg-avatar"><FiCpu /></div>
                      <div className="chat-msg-bubble typing">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 2 && (
                  <div className="chatbot-quick-actions">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        className="quick-action-btn"
                        onClick={() => {
                          setInput(action.msg);
                          setTimeout(() => handleSend(), 100);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="chatbot-input-area">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="chatbot-input"
                  />
                  <button
                    className="chatbot-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <FiSend />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
