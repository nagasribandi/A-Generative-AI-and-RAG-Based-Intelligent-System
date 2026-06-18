import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { saveComplaint } from '../services/aiEngine';
import { pyFullAnalysis, pyClassifyComplaint, pyPredictPriority, pyGenerateRAGResponse, pyGenerateAISummary } from '../services/pythonAiService';
import { sendUrgentComplaintEmail } from '../services/emailService';
import { awardPoints } from '../services/gamification';
import { FiSend, FiCpu, FiMapPin, FiFileText, FiAlertTriangle, FiCheckCircle, FiLoader, FiMail, FiZap, FiMic, FiMicOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/submit.css';

// Gemini API for voice translation + form extraction
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function callGeminiForVoice(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini API key not configured');
  }
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    })
  });
  if (!response.ok) throw new Error('Gemini API error');
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

export default function SubmitComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: ''
  });
  const [errors, setErrors] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // ===== VOICE ASSISTANT STATE =====
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef(null);

  const locations = [
    'Block 1 - Ground Floor',
    'Block 1 - 1st Floor',
    'Block 1 - 2nd Floor',
    'Block 1 - Computer Lab 1',
    'Block 1 - Computer Lab 2',
    'Block 1 - Server Room',
    'Block 2 - Ground Floor',
    'Block 2 - 1st Floor',
    'Block 2 - 2nd Floor',
    'Block 3 - Ground Floor',
    'Block 3 - 1st Floor',
    'Block 3 - Room 101-110',
    'Block 3 - Room 201-210',
    'Block 4 - Ground Floor',
    'Block 4 - 1st Floor',
    'Block 5 - Ground Floor',
    'Block 5 - 1st Floor',
    'Library - Ground Floor',
    'Library - 1st Floor',
    'Hostel - Boys Block A',
    'Hostel - Boys Block B',
    'Hostel - Girls Block A',
    'Hostel - Girls Block B',
    'Sports Ground',
    'Parking Area',
    'Campus Grounds',
    'Other'
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'description' && aiAnalysis) {
      setAiAnalysis(null);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const maxBytes = 3.5 * 1024 * 1024;
    if (f.size > maxBytes) {
      toast.error('Image too large. Please upload an image smaller than 3.5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageFile({ name: f.name, data: reader.result });
    };
    reader.readAsDataURL(f);
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    else if (formData.title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    if (!formData.description.trim()) errs.description = 'Description is required';
    else if (formData.description.trim().length < 20) errs.description = 'Please provide a more detailed description (at least 20 characters)';
    if (!formData.location) errs.location = 'Please select a location';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ===== VOICE ASSISTANT LOGIC =====
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    // Hint to browser to listen for Indian accents/languages
    recognition.lang = 'hi-IN'; 
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setVoiceText(finalTranscript + interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone permission.');
      } else if (event.error !== 'aborted') {
        toast.error('Voice recognition error: ' + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceText('');
    toast.info('🎙️ Listening... Speak in any language');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Process voice text with Gemini AI — translate + extract complaint details
  const processVoiceWithAI = async () => {
    if (!voiceText.trim()) {
      toast.warning('No speech detected. Please speak and try again.');
      return;
    }

    setVoiceProcessing(true);

    try {
      const prompt = `You are a smart assistant for a college campus complaint system.

A user has spoken (possibly in Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Urdu, or any other Indian language, or English). Their speech has been transcribed as:
"${voiceText}"

Your job:
1. Translate the speech to clear, proper English
2. Understand the complaint/problem they described
3. Generate a short title (5-10 words) for the complaint
4. Generate a detailed English description (2-4 sentences) of the complaint
5. Try to identify the location from their speech. Match it to one of these campus locations if possible: ${locations.join(', ')}. If no match, return "Other".

IMPORTANT: The transcription may be messy or in mixed language. Use your best understanding.

Respond in EXACTLY this JSON format, nothing else:
{
  "translatedText": "Full English translation of what they said",
  "title": "Short complaint title",
  "description": "Detailed English description of the problem",
  "location": "Best matching location or Other"
}`;

      const raw = await callGeminiForVoice(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');

      const parsed = JSON.parse(jsonMatch[0]);

      // Auto-fill the form
      setFormData({
        title: parsed.title || '',
        description: parsed.description || parsed.translatedText || '',
        location: locations.includes(parsed.location) ? parsed.location : ''
      });

      setAiAnalysis(null); // Reset so user must re-analyze
      toast.success('✅ Voice translated & form filled by AI!');
    } catch (err) {
      console.error('Voice AI processing error:', err);
      // Fallback: just put raw text in description
      setFormData(prev => ({
        ...prev,
        description: prev.description + (prev.description ? '\n' : '') + voiceText
      }));
      toast.warning('AI translation unavailable. Raw speech text added to description.');
    }

    setVoiceProcessing(false);
  };

  const handleAnalyze = async () => {
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast.warning('Please enter a more detailed description for AI analysis');
      return;
    }

    setAnalyzing(true);

    try {
      toast.info('🐍 Running Python AI analysis...', { autoClose: 2000 });
      const result = await pyFullAnalysis(formData.description);

      setAiAnalysis({
        category: result.classification.category,
        confidence: result.classification.confidence,
        priority: result.priority,
        ragResponse: result.ragResponse,
        summary: result.summary,
        aiSource: result.source
      });

      if (result.source === 'gemini') {
        toast.success('✨ Gemini AI analysis complete!');
      } else if (result.source === 'hybrid') {
        toast.info('🔄 Hybrid analysis: Gemini AI + rule-based engine');
      } else {
        toast.info('📊 Analysis complete using Python AI engine');
      }
    } catch (error) {
      console.error('Python AI Backend error, using client fallback:', error);
      try {
        const classification = await pyClassifyComplaint(formData.description);
        const priority = await pyPredictPriority(formData.description);
        const ragResponse = await pyGenerateRAGResponse(classification.category);
        const summary = await pyGenerateAISummary(formData.description, classification.category, priority.level);

        setAiAnalysis({
          ...classification,
          priority,
          ragResponse,
          summary,
          aiSource: 'rule-based'
        });
        toast.info('AI analysis complete! Review the results below.');
      } catch (fallbackError) {
        console.error('All AI backends failed:', fallbackError);
        toast.error('AI analysis temporarily unavailable. Please try again.');
      }
    }
    
    setAnalyzing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!aiAnalysis) {
      toast.warning('Please run AI analysis first before submitting');
      return;
    }

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const complaint = {
      id: 'CMP-' + String(Date.now()).slice(-6),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      category: aiAnalysis.category,
      predictedCategory: aiAnalysis.category,
      confidence: aiAnalysis.confidence,
      priority: aiAnalysis.priority.level,
      status: 'Open',
      aiSummary: aiAnalysis.summary,
      ragResponse: aiAnalysis.ragResponse,
      imageName: imageFile?.name || null,
      imageData: imageFile?.data || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

  await saveComplaint(complaint);

    const pointsResult = awardPoints(user.id, user.name, 'SUBMIT_COMPLAINT', complaint.id);
    if (complaint.priority === 'High') {
      awardPoints(user.id, user.name, 'HIGH_PRIORITY_REPORT', complaint.id);
    }
    
    if (complaint.priority === 'High') {
      const emailResult = await sendUrgentComplaintEmail(complaint);
      if (emailResult.success) {
        if (emailResult.demo) {
          toast.info('📧 Demo: Admin notification would be sent for this urgent complaint');
        } else {
          toast.info('📧 Admins have been notified via email about this urgent complaint');
        }
      }
    }
    
    setSubmitted(true);
    setSubmitting(false);
  toast.success(`🎉 Complaint submitted! You earned +${pointsResult.points} points`);
    
    setTimeout(() => navigate('/complaints'), 2000);
  };

  if (submitted) {
    return (
      <div className="submit-page">
        <motion.div 
          className="success-card"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FiCheckCircle className="success-icon" />
          <h2>Complaint Submitted!</h2>
          <p>Your complaint has been classified as <strong>{aiAnalysis.category}</strong> with 
          <strong> {aiAnalysis.priority.level}</strong> priority.</p>
          <p>The AI has generated an action plan and it has been routed to the appropriate department.</p>
          {aiAnalysis.priority.level === 'High' && (
            <p className="urgent-email-notice"><FiMail /> 📧 Admin team has been notified via email for immediate action</p>
          )}
          <p className="redirect-text">Redirecting to complaints...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="submit-page">
      <div className="submit-header">
        <h1><FiFileText /> Submit New Complaint</h1>
        <p>Describe your issue and let AI classify and prioritize it automatically</p>
      </div>

      <div className="submit-layout">
        {/* Form Section */}
        <div className="submit-form-section">
          {/* ===== VOICE ASSISTANT — DIRECT MIC ===== */}
          <div className="voice-section">
            <div className="voice-row">
              <button
                type="button"
                className={`btn-voice-mic ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
                disabled={voiceProcessing}
              >
                <div className={`mic-ring ${isListening ? 'active' : ''}`}>
                  {isListening ? <FiMicOff /> : <FiMic />}
                </div>
              </button>
              <div className="voice-info">
                <span className="voice-title">
                  {isListening ? '🔴 Listening... Speak now' : voiceProcessing ? '⏳ AI processing...' : '🎙️ Voice Assistant'}
                </span>
                <span className="voice-subtitle">
                  {isListening
                    ? 'Speak in any language — tap mic to stop'
                    : voiceText && !voiceProcessing
                    ? 'Speech captured! Click "Translate & Fill" below'
                    : 'Tap the mic and speak your complaint in any language'}
                </span>
              </div>
              {isListening && (
                <div className="listening-indicator">
                  <span className="pulse-dot"></span>
                  <span className="pulse-dot"></span>
                  <span className="pulse-dot"></span>
                </div>
              )}
            </div>

            {/* Live Transcript */}
            <AnimatePresence>
              {voiceText && (
                <motion.div
                  className="voice-transcript"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label>What we heard:</label>
                  <div className="transcript-text">{voiceText}</div>

                  {/* Process Button — visible after speech stops */}
                  {!isListening && (
                    <button
                      type="button"
                      className="btn-process-voice"
                      onClick={processVoiceWithAI}
                      disabled={voiceProcessing}
                    >
                      {voiceProcessing ? (
                        <><FiLoader className="spin" /> AI is translating & filling form...</>
                      ) : (
                        <><FiCpu /> Translate & Fill Form with AI</>
                      )}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={`form-group ${errors.title ? 'error' : ''}`}>
              <label>Complaint Title</label>
              <input
                type="text"
                placeholder="Brief title describing the issue"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                maxLength={100}
              />
              <div className="char-count">{formData.title.length}/100</div>
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            <div className={`form-group ${errors.description ? 'error' : ''}`}>
              <label>Detailed Description</label>
              <textarea
                placeholder="Describe the problem in detail. Include what, where, when, and severity. The more detail you provide, the better the AI classification will be..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={6}
                maxLength={2000}
              />
              <div className="char-count">{formData.description.length}/2000</div>
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>

            <div className={`form-group ${errors.location ? 'error' : ''}`}>
              <label><FiMapPin /> Location</label>
              <select
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
              >
                <option value="">Select location of the issue</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              {errors.location && <span className="error-text">{errors.location}</span>}
            </div>

            <div className="form-group">
              <label>Attach Image (optional)</label>
              <div className="input-wrapper">
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="preview" style={{ maxWidth: '200px', borderRadius: 8, marginTop: 8 }} />
                </div>
              )}
            </div>

            {/* AI Analyze Button */}
            <button 
              type="button" 
              className="btn-analyze" 
              onClick={handleAnalyze}
              disabled={analyzing || !formData.description.trim()}
            >
              {analyzing ? (
                <>
                  <FiLoader className="spin" /> Analyzing with GenAI...
                </>
              ) : (
                <>
                  <FiCpu /> Analyze with AI
                </>
              )}
            </button>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit-complaint"
              disabled={submitting || !aiAnalysis}
            >
              {submitting ? (
                <>
                  <FiLoader className="spin" /> Submitting...
                </>
              ) : (
                <>
                  <FiSend /> Submit Complaint
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI Analysis Panel */}
        <div className="ai-analysis-panel">
          <AnimatePresence>
            {!aiAnalysis && !analyzing && (
              <motion.div 
                className="analysis-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FiCpu className="placeholder-icon" />
                <h3>AI Analysis</h3>
                <p>Enter your complaint description and click "Analyze with AI" to get automatic classification, priority prediction, and recommended action plan.</p>
              </motion.div>
            )}

            {analyzing && (
              <motion.div 
                className="analyzing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="ai-pulse"></div>
                <h3>🤖 AI Processing...</h3>
                <p>Querying Python AI backend...</p>
                <p>Running NLP classification & priority analysis...</p>
                <p>Generating RAG action plan...</p>
              </motion.div>
            )}

            {aiAnalysis && !analyzing && (
              <motion.div 
                className="analysis-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3>🤖 AI Analysis Results</h3>
                
                {/* AI Source Badge */}
                <div className="ai-source-badge-container">
                  {aiAnalysis.aiSource === 'gemini' && (
                    <span className="ai-source-badge gemini"><FiZap /> Powered by Google Gemini AI</span>
                  )}
                  {aiAnalysis.aiSource === 'hybrid' && (
                    <span className="ai-source-badge hybrid"><FiZap /> Gemini AI + Rule Engine</span>
                  )}
                  {aiAnalysis.aiSource === 'rule-based' && (
                    <span className="ai-source-badge rule-based"><FiCpu /> Rule-Based AI Engine</span>
                  )}
                </div>

                {/* Category */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Predicted Category</span>
                    <span className="confidence-badge">{aiAnalysis.confidence}% confidence</span>
                  </div>
                  <div className="result-value category-value">{aiAnalysis.category}</div>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${aiAnalysis.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Priority */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Priority Level</span>
                    <FiAlertTriangle style={{ color: aiAnalysis.priority.color }} />
                  </div>
                  <div className="result-value">
                    <span 
                      className="priority-indicator"
                      style={{ backgroundColor: aiAnalysis.priority.color }}
                    ></span>
                    {aiAnalysis.priority.level} Priority
                  </div>
                </div>

                {/* AI Summary */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">AI Summary</span>
                  </div>
                  <p className="ai-summary-text">{aiAnalysis.summary}</p>
                </div>

                {/* SOPs */}
                <div className="result-card">
                  <div className="result-header">
                    <span className="result-label">Retrieved SOPs (RAG)</span>
                  </div>
                  <ul className="sop-list">
                    {aiAnalysis.ragResponse.sops.map((sop, i) => (
                      <li key={i}><FiFileText /> {sop}</li>
                    ))}
                  </ul>
                </div>

                {/* Action Plan */}
                <div className="result-card action-plan-card">
                  <div className="result-header">
                    <span className="result-label">Generated Action Plan</span>
                  </div>
                  <ol className="action-plan-list">
                    {aiAnalysis.ragResponse.actionPlan.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
