// =====================================================
// Python AI Backend Service — Frontend API Wrapper
// Calls the Python serverless function at /api/ai
// =====================================================

const AI_API_URL = '/api/ai';

// Helper to call the Python AI backend
async function callPythonAI(payload) {
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Python AI backend error: ${response.status}`);
  }

  return response.json();
}

// ========== Rule-Based AI Functions (Python Backend) ==========

export async function pyClassifyComplaint(text) {
  return callPythonAI({ action: 'classify', text });
}

export async function pyPredictPriority(text) {
  return callPythonAI({ action: 'priority', text });
}

export async function pyGenerateRAGResponse(category) {
  return callPythonAI({ action: 'rag', category });
}

export async function pyGenerateAISummary(text, category, priority) {
  const result = await callPythonAI({ action: 'summary', text, category, priority });
  return result.summary;
}

// ========== Gemini-Enhanced AI Functions (Python Backend) ==========

export async function pyGeminiClassify(text) {
  return callPythonAI({ action: 'gemini_classify', text });
}

export async function pyGeminiPriority(text) {
  return callPythonAI({ action: 'gemini_priority', text });
}

export async function pyGeminiSummary(text, category, priority) {
  return callPythonAI({ action: 'gemini_summary', text, category, priority });
}

export async function pyGeminiRAG(text, category) {
  return callPythonAI({ action: 'gemini_rag', text, category });
}

export async function pyGeminiChat(message, history, stats) {
  return callPythonAI({ action: 'gemini_chat', message, history, stats });
}

// ========== Full Analysis Pipeline (Python Backend) ==========

export async function pyFullAnalysis(description) {
  return callPythonAI({ action: 'full_analysis', text: description });
}

// ========== Health Check ==========

export async function pyHealthCheck() {
  return callPythonAI({ action: 'health' });
}
