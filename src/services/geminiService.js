// =====================================================
// Google Gemini AI Service — Real Generative AI Layer
// Falls back to rule-based engine if API unavailable
// =====================================================

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Track Gemini availability
let geminiAvailable = !!GEMINI_API_KEY;

export function isGeminiEnabled() {
  return geminiAvailable;
}

// Core Gemini API call
async function callGemini(prompt, temperature = 0.3) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text.trim();
}

// ========== 1. AI Complaint Classification ==========
export async function geminiClassifyComplaint(description) {
  const prompt = `You are an AI assistant for a Smart Campus Problem Detection System at Vardhaman College of Engineering. 
Classify the following campus complaint into exactly ONE category from this list:
- Infrastructure
- Electrical
- Plumbing
- IT & Network
- Cleanliness
- Safety & Security
- Furniture
- Academic
- Hostel
- Transport

Also provide a confidence score (60-98) based on how clearly the complaint matches the category.

Complaint: "${description}"

Respond in EXACTLY this JSON format, no extra text:
{"category": "CategoryName", "confidence": 85}`;

  const raw = await callGemini(prompt, 0.1);
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Invalid classification response');
  const parsed = JSON.parse(jsonMatch[0]);

  const validCategories = ['Infrastructure', 'Electrical', 'Plumbing', 'IT & Network', 'Cleanliness', 'Safety & Security', 'Furniture', 'Academic', 'Hostel', 'Transport'];
  if (!validCategories.includes(parsed.category)) {
    throw new Error('Invalid category returned');
  }

  return {
    category: parsed.category,
    confidence: Math.min(98, Math.max(60, parsed.confidence || 80)),
    source: 'gemini'
  };
}

// ========== 2. AI Priority Prediction ==========
export async function geminiPredictPriority(description) {
  const prompt = `You are an AI for a campus complaint system at Vardhaman College of Engineering.
Analyze this complaint and determine its priority level.

Rules:
- "High" = safety risks, emergencies, fire, flooding, electrical hazards, structural damage, theft, anything that could harm people
- "Medium" = broken equipment, recurring issues, things that disrupt daily activities but aren't dangerous
- "Low" = minor inconveniences, cosmetic issues, suggestions, things that can wait

Complaint: "${description}"

Respond in EXACTLY this JSON format, no extra text:
{"level": "High", "reasoning": "Brief 1-line reason"}`;

  const raw = await callGemini(prompt, 0.1);
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('Invalid priority response');
  const parsed = JSON.parse(jsonMatch[0]);

  const colors = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#22c55e' };
  const level = ['High', 'Medium', 'Low'].includes(parsed.level) ? parsed.level : 'Medium';

  return {
    level,
    color: colors[level],
    reasoning: parsed.reasoning || '',
    source: 'gemini'
  };
}

// ========== 3. AI Summary Generation ==========
export async function geminiGenerateSummary(description, category, priority) {
  const prompt = `You are an AI assistant for the Smart Campus Problem Detection System at Vardhaman College of Engineering, Shamshabad.

Generate a professional, actionable summary for this campus complaint. The summary should:
1. Acknowledge the issue concisely
2. State the AI classification and why
3. Recommend immediate next steps
4. Be 3-5 sentences long

Complaint: "${description}"
AI-Classified Category: ${category}
AI-Predicted Priority: ${priority}

Start with the appropriate emoji: ⚠️ for High, 📋 for Medium, ℹ️ for Low priority.
Write the summary directly, no JSON.`;

  const text = await callGemini(prompt, 0.5);
  return { summary: text, source: 'gemini' };
}

// ========== 4. AI-Enhanced RAG Response ==========
export async function geminiGenerateRAG(description, category, sopData) {
  const prompt = `You are an AI assistant for a Smart Campus system at Vardhaman College of Engineering.

Based on this complaint and the retrieved Standard Operating Procedures, generate a customized action plan.

Complaint: "${description}"
Category: ${category}

Retrieved SOPs:
${sopData.sops.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Standard Action Steps:
${sopData.actionPlan.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Now generate a CUSTOMIZED 6-8 step action plan specifically tailored to this complaint. Each step should be concrete and reference the specific issue described. Also generate a 2-sentence RAG summary.

Respond in EXACTLY this JSON format:
{
  "actionPlan": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5...", "Step 6..."],
  "generatedSummary": "Your 2-sentence RAG retrieval summary here."
}`;

  const raw = await callGemini(prompt, 0.4);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid RAG response');
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    sops: sopData.sops,
    actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : sopData.actionPlan,
    generatedSummary: parsed.generatedSummary || sopData.generatedSummary,
    source: 'gemini'
  };
}

// ========== 5. AI Chatbot Response ==========
export async function geminiChatResponse(userMessage, conversationHistory, campusStats) {
  const historyText = conversationHistory
    .slice(-6) // last 6 messages for context
    .map(m => `${m.sender === 'user' ? 'Student' : 'AI'}: ${m.text}`)
    .join('\n');

  const prompt = `You are an AI chatbot assistant for the Smart Campus Problem Detection System at Vardhaman College of Engineering, Shamshabad, Telangana.

Your role:
- Help students file campus complaints (infrastructure, electrical, plumbing, IT, cleanliness, safety, furniture, academic, hostel, transport)
- Answer questions about the campus complaint system
- Analyze campus issues when students describe problems
- Provide campus statistics when asked
- Guide users to the right page (Dashboard, Submit Complaint, Complaints, Campus Heatmap, Leaderboard, Analytics, Profile)

Campus Stats:
- Total complaints: ${campusStats.total}
- Open: ${campusStats.open}
- In Progress: ${campusStats.inProgress}  
- Resolved: ${campusStats.resolved}

Recent conversation:
${historyText}

Student's message: "${userMessage}"

Instructions:
- Be helpful, friendly, and concise (max 4-5 sentences unless asked for detail)
- Use emojis naturally
- If the student describes a campus problem, classify it into one of the 10 categories and suggest they file it
- If they want to navigate somewhere, mention the page name
- If you don't know something, say so honestly
- Remember this is a COLLEGE campus system, not a general chatbot

Respond directly as the AI assistant:`;

  const text = await callGemini(prompt, 0.7);
  return { text, source: 'gemini' };
}

// ========== 6. Full AI Analysis Pipeline ==========
// This runs classification + priority + RAG + summary with Gemini, 
// falling back to rule-based on any failure
export async function geminiFullAnalysis(description, fallbackFns) {
  const results = { source: 'gemini', errors: [] };

  // Classification
  try {
    results.classification = await geminiClassifyComplaint(description);
  } catch (err) {
    results.errors.push(`Classification: ${err.message}`);
    results.classification = { ...fallbackFns.classify(description), source: 'rule-based' };
  }

  // Priority
  try {
    results.priority = await geminiPredictPriority(description);
  } catch (err) {
    results.errors.push(`Priority: ${err.message}`);
    results.priority = { ...fallbackFns.priority(description), source: 'rule-based' };
  }

  // RAG
  try {
    const sopData = fallbackFns.rag(results.classification.category);
    results.ragResponse = await geminiGenerateRAG(description, results.classification.category, sopData);
  } catch (err) {
    results.errors.push(`RAG: ${err.message}`);
    results.ragResponse = { ...fallbackFns.rag(results.classification.category), source: 'rule-based' };
  }

  // Summary
  try {
    const summaryResult = await geminiGenerateSummary(description, results.classification.category, results.priority.level);
    results.summary = summaryResult.summary;
  } catch (err) {
    results.errors.push(`Summary: ${err.message}`);
    results.summary = fallbackFns.summary(description, results.classification.category, results.priority.level);
    results.summarySource = 'rule-based';
  }

  results.source = results.errors.length === 0 ? 'gemini' : 
                   results.errors.length === 4 ? 'rule-based' : 'hybrid';
  
  return results;
}
