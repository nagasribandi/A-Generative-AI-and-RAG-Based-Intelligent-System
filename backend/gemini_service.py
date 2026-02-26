"""
Gemini AI Service — Google Generative AI Integration
=====================================================
Integrates Google Gemini AI (generative language model)
for enhanced NLP processing in the Smart Campus system.

Features:
- AI-powered complaint classification (enhanced accuracy)
- Intelligent priority prediction with reasoning
- Natural language summary generation
- Enhanced RAG with Gemini-customized action plans
- Conversational AI chatbot

Model: Gemini 2.0 Flash
API: Google Generative Language API v1beta
"""

import json
import re
import os
import urllib.request
import urllib.error
from typing import Dict, List, Optional


class GeminiAIService:
    """
    Google Gemini AI integration for enhanced NLP processing.
    Falls back to rule-based engine when Gemini is unavailable.
    """

    API_KEY = os.environ.get('GEMINI_API_KEY', os.environ.get('REACT_APP_GEMINI_API_KEY', ''))
    API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

    VALID_CATEGORIES = [
        'Infrastructure', 'Electrical', 'Plumbing', 'IT & Network',
        'Cleanliness', 'Safety & Security', 'Furniture', 'Academic',
        'Hostel', 'Transport'
    ]

    PRIORITY_COLORS = {
        'High': '#ef4444',
        'Medium': '#f59e0b',
        'Low': '#22c55e'
    }

    def __init__(self):
        """Initialize Gemini AI Service."""
        self.is_configured = bool(self.API_KEY)

    def get_status(self) -> str:
        """Return service status."""
        if self.is_configured:
            return "Active — Gemini 2.0 Flash configured"
        return "Inactive — API key not configured (using rule-based fallback)"

    def _call_api(self, prompt: str, temperature: float = 0.3) -> str:
        """
        Make a direct API call to Google Gemini.

        Args:
            prompt: The text prompt to send to Gemini
            temperature: Generation temperature (0.0 = deterministic, 1.0 = creative)

        Returns:
            Generated text response from Gemini

        Raises:
            Exception: If API call fails or response is empty
        """
        if not self.API_KEY:
            raise Exception('Gemini API key not configured')

        payload = json.dumps({
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': temperature,
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
            f'{self.API_URL}?key={self.API_KEY}',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                text = (data.get('candidates', [{}])[0]
                        .get('content', {})
                        .get('parts', [{}])[0]
                        .get('text', ''))
                if not text:
                    raise Exception('Empty Gemini response')
                return text.strip()
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='ignore')
            raise Exception(f'Gemini API error {e.code}: {body[:200]}')

    def classify_complaint(self, description: str) -> Dict:
        """
        Use Gemini AI to classify a campus complaint.

        Sends the complaint to Gemini with a structured prompt
        requesting JSON output with category and confidence score.

        Args:
            description: Complaint text to classify

        Returns:
            dict with 'category', 'confidence', and 'source'
        """
        prompt = f"""You are an AI assistant for a Smart Campus Problem Detection System at Vardhaman College of Engineering. 
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

Complaint: "{description}"

Respond in EXACTLY this JSON format, no extra text:
{{"category": "CategoryName", "confidence": 85}}"""

        raw = self._call_api(prompt, 0.1)
        match = re.search(r'\{[\s\S]*?\}', raw)
        if not match:
            raise Exception('Invalid classification response')
        parsed = json.loads(match.group())

        if parsed.get('category') not in self.VALID_CATEGORIES:
            raise Exception('Invalid category returned by Gemini')

        return {
            'category': parsed['category'],
            'confidence': min(98, max(60, parsed.get('confidence', 80))),
            'source': 'gemini'
        }

    def predict_priority(self, description: str) -> Dict:
        """
        Use Gemini AI to predict complaint priority with reasoning.

        Args:
            description: Complaint text to analyze

        Returns:
            dict with 'level', 'color', 'reasoning', and 'source'
        """
        prompt = f"""You are an AI for a campus complaint system at Vardhaman College of Engineering.
Analyze this complaint and determine its priority level.

Rules:
- "High" = safety risks, emergencies, fire, flooding, electrical hazards, structural damage, theft
- "Medium" = broken equipment, recurring issues, things that disrupt daily activities
- "Low" = minor inconveniences, cosmetic issues, suggestions

Complaint: "{description}"

Respond in EXACTLY this JSON format, no extra text:
{{"level": "High", "reasoning": "Brief 1-line reason"}}"""

        raw = self._call_api(prompt, 0.1)
        match = re.search(r'\{[\s\S]*?\}', raw)
        if not match:
            raise Exception('Invalid priority response')
        parsed = json.loads(match.group())

        level = parsed.get('level', 'Medium')
        if level not in self.PRIORITY_COLORS:
            level = 'Medium'

        return {
            'level': level,
            'color': self.PRIORITY_COLORS[level],
            'reasoning': parsed.get('reasoning', ''),
            'source': 'gemini'
        }

    def generate_summary(self, description: str, category: str, priority: str) -> Dict:
        """
        Use Gemini AI to generate a professional complaint summary.

        Args:
            description: Original complaint text
            category: Classified category
            priority: Priority level

        Returns:
            dict with 'summary' and 'source'
        """
        prompt = f"""You are an AI assistant for the Smart Campus Problem Detection System at Vardhaman College of Engineering, Shamshabad.

Generate a professional, actionable summary for this campus complaint. The summary should:
1. Acknowledge the issue concisely
2. State the AI classification and why
3. Recommend immediate next steps
4. Be 3-5 sentences long

Complaint: "{description}"
AI-Classified Category: {category}
AI-Predicted Priority: {priority}

Start with the appropriate emoji: ⚠️ for High, 📋 for Medium, ℹ️ for Low priority.
Write the summary directly, no JSON."""

        text = self._call_api(prompt, 0.5)
        return {'summary': text, 'source': 'gemini'}

    def generate_enhanced_rag(self, description: str, category: str, sop_data: Dict) -> Dict:
        """
        Use Gemini AI to generate enhanced RAG responses.

        Takes the retrieved SOPs and generates a customized
        action plan specifically tailored to the complaint.

        Args:
            description: Complaint text
            category: Classified category
            sop_data: Retrieved SOP data from RAG pipeline

        Returns:
            Enhanced RAG response with customized action plan
        """
        sops_text = '\n'.join([f'{i+1}. {s}' for i, s in enumerate(sop_data['sops'])])
        action_text = '\n'.join([f'{i+1}. {s}' for i, s in enumerate(sop_data['actionPlan'])])

        prompt = f"""You are an AI assistant for a Smart Campus system at Vardhaman College of Engineering.

Based on this complaint and the retrieved Standard Operating Procedures, generate a customized action plan.

Complaint: "{description}"
Category: {category}

Retrieved SOPs:
{sops_text}

Standard Action Steps:
{action_text}

Generate a CUSTOMIZED 6-8 step action plan specifically tailored to this complaint.

Respond in EXACTLY this JSON format:
{{
  "actionPlan": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5...", "Step 6..."],
  "generatedSummary": "Your 2-sentence RAG retrieval summary here."
}}"""

        raw = self._call_api(prompt, 0.4)
        match = re.search(r'\{[\s\S]*\}', raw)
        if not match:
            raise Exception('Invalid RAG response')
        parsed = json.loads(match.group())

        return {
            'sops': sop_data['sops'],
            'actionPlan': parsed.get('actionPlan', sop_data['actionPlan']),
            'generatedSummary': parsed.get('generatedSummary', sop_data.get('generatedSummary', '')),
            'source': 'gemini'
        }
