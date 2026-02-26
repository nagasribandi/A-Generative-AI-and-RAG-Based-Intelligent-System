"""
Chatbot Engine — AI-Powered Campus Assistant
=============================================
Intelligent chatbot for the Smart Campus Problem Detection System.
Combines rule-based responses with Gemini AI for natural conversation.

Features:
- FAQ knowledge base with pattern matching
- Campus statistics integration
- Navigation assistance
- Complaint analysis via AI
- Gemini-powered intelligent responses
"""

import json
import os
import re
import urllib.request
import urllib.error
from typing import Dict, List, Optional


class ChatbotEngine:
    """
    AI Chatbot Engine for the Smart Campus system.
    Handles student queries using a combination of rule-based
    pattern matching and Gemini AI for natural language understanding.
    """

    # =========================================================
    # FAQ Knowledge Base
    # =========================================================
    FAQ_KNOWLEDGE = [
        {
            'patterns': ['how.*submit', 'file.*complaint', 'report.*issue', 'new complaint', 'raise.*complaint'],
            'response': (
                'To submit a complaint:\n'
                '1️⃣ Click "Submit Complaint" in the sidebar\n'
                '2️⃣ Enter a title and detailed description\n'
                '3️⃣ Select the location from the dropdown\n'
                '4️⃣ Click "Analyze with AI" to auto-classify\n'
                '5️⃣ Review the AI analysis and click Submit!'
            )
        },
        {
            'patterns': ['track.*complaint', 'check.*status', 'my complaint', 'complaint status'],
            'response': (
                'You can track your complaints by:\n'
                '📋 Going to "Complaints" in the sidebar\n'
                '🔍 Click on any complaint to see full details\n'
                '📊 The Dashboard also shows your recent complaints'
            )
        },
        {
            'patterns': ['heatmap', 'campus map', 'zone', 'hotspot'],
            'response': (
                '🗺️ The Campus Heatmap shows complaint density across all zones.\n'
                '🟢 Green = No issues | 🟡 Yellow = Low\n'
                '🟠 Orange = Moderate | 🔴 Red = High'
            )
        },
        {
            'patterns': ['leaderboard', 'points', 'rewards', 'badges', 'gamification'],
            'response': (
                '🏆 You earn points by:\n'
                '• +10 pts for submitting complaints\n'
                '• +25 pts when resolved\n'
                '• +15 pts for urgent reports\n'
                '• +20 bonus for your first report!'
            )
        },
        {
            'patterns': ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
            'response': (
                "Hello! 👋 I'm the SmartCampus AI Assistant. I can help you with:\n"
                '🔹 Filing complaints\n'
                '🔹 Checking campus issues\n'
                '🔹 Answering FAQs\n'
                '🔹 Navigating the system'
            )
        },
        {
            'patterns': ['help', 'what.*can.*do', 'features', 'options'],
            'response': (
                "Here's what I can do:\n"
                '🤖 **Analyze Issues** — Describe a problem and I\'ll classify it\n'
                '📋 **File Complaints** — I\'ll guide you through the process\n'
                '🗺️ **Campus Info** — Ask about any zone or area\n'
                '📊 **Statistics** — Current complaint data\n'
                '🏆 **Rewards** — Check your points and badges'
            )
        },
        {
            'patterns': ['category', 'categories', 'types.*complaint'],
            'response': (
                'We handle 10 complaint categories:\n'
                '🏗️ Infrastructure | ⚡ Electrical | 🔧 Plumbing\n'
                '💻 IT & Network | 🧹 Cleanliness | 🔒 Safety\n'
                '🪑 Furniture | 📚 Academic | 🏠 Hostel | 🚌 Transport'
            )
        }
    ]

    # Gemini API configuration
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', os.environ.get('REACT_APP_GEMINI_API_KEY', ''))
    GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

    def __init__(self):
        """Initialize the Chatbot Engine."""
        self.gemini_available = bool(self.GEMINI_API_KEY)

    def get_status(self) -> str:
        """Return chatbot status."""
        mode = "Gemini AI + Rule-based" if self.gemini_available else "Rule-based only"
        return f"Active — {mode} ({len(self.FAQ_KNOWLEDGE)} FAQ patterns)"

    def match_faq(self, user_input: str) -> Optional[str]:
        """
        Match user input against FAQ patterns.

        Args:
            user_input: The user's message

        Returns:
            FAQ response if matched, None otherwise
        """
        lower = user_input.lower().strip()
        for faq in self.FAQ_KNOWLEDGE:
            for pattern in faq['patterns']:
                if re.search(pattern, lower, re.IGNORECASE):
                    return faq['response']
        return None

    def generate_gemini_response(self, user_message: str,
                                  conversation_history: List[Dict],
                                  campus_stats: Dict) -> Dict:
        """
        Generate an intelligent response using Google Gemini AI.

        Args:
            user_message: The student's current message
            conversation_history: Recent conversation context
            campus_stats: Current campus complaint statistics

        Returns:
            dict with 'text' and 'source'
        """
        if not self.GEMINI_API_KEY:
            raise Exception('Gemini API key not configured')

        # Build conversation context
        history_lines = []
        for m in (conversation_history or [])[-6:]:
            role = 'Student' if m.get('sender') == 'user' else 'AI'
            history_lines.append(f'{role}: {m.get("text", "")}')
        history_text = '\n'.join(history_lines)

        prompt = f"""You are an AI chatbot assistant for the Smart Campus Problem Detection System at Vardhaman College of Engineering, Shamshabad, Telangana.

Your role:
- Help students file campus complaints (10 categories)
- Answer questions about the campus complaint system
- Analyze campus issues when students describe problems
- Provide campus statistics when asked
- Guide users to the right page

Campus Stats:
- Total complaints: {campus_stats.get('total', 0)}
- Open: {campus_stats.get('open', 0)}
- In Progress: {campus_stats.get('inProgress', 0)}
- Resolved: {campus_stats.get('resolved', 0)}

Recent conversation:
{history_text}

Student's message: "{user_message}"

Instructions:
- Be helpful, friendly, and concise (max 4-5 sentences)
- Use emojis naturally
- If the student describes a campus problem, classify it and suggest filing
- Remember this is a COLLEGE campus system

Respond directly as the AI assistant:"""

        payload = json.dumps({
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.7,
                'maxOutputTokens': 1024,
                'topP': 0.95,
                'topK': 40
            },
            'safetySettings': [
                {'category': 'HARM_CATEGORY_HARASSMENT', 'threshold': 'BLOCK_NONE'},
                {'category': 'HARM_CATEGORY_HATE_SPEECH', 'threshold': 'BLOCK_NONE'},
                {'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold': 'BLOCK_NONE'},
                {'category': 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold': 'BLOCK_NONE'}
            ]
        }).encode('utf-8')

        req = urllib.request.Request(
            f'{self.GEMINI_API_URL}?key={self.GEMINI_API_KEY}',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            text = (data.get('candidates', [{}])[0]
                    .get('content', {})
                    .get('parts', [{}])[0]
                    .get('text', ''))
            if not text:
                raise Exception('Empty Gemini response')
            return {'text': text.strip(), 'source': 'gemini'}

    def respond(self, user_message: str,
                conversation_history: List[Dict] = None,
                campus_stats: Dict = None) -> Dict:
        """
        Main response method. Tries Gemini first, falls back to FAQ/rule-based.

        Args:
            user_message: Student's message
            conversation_history: Recent messages for context
            campus_stats: Current complaint statistics

        Returns:
            dict with 'text' and 'source'
        """
        # Try Gemini AI first
        if self.gemini_available:
            try:
                return self.generate_gemini_response(
                    user_message,
                    conversation_history or [],
                    campus_stats or {}
                )
            except Exception as e:
                print(f"Gemini chatbot error: {e}")

        # Fallback to FAQ matching
        faq_response = self.match_faq(user_message)
        if faq_response:
            return {'text': faq_response, 'source': 'rule-based'}

        # Default fallback
        return {
            'text': (
                "I'm not sure I understood that. Try asking me about:\n"
                '🔹 "How to submit a complaint"\n'
                '🔹 "Show campus statistics"\n'
                '🔹 "What are the complaint categories"\n'
                '🔹 Or describe an issue and I\'ll analyze it!'
            ),
            'source': 'rule-based'
        }
