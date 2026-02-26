"""
Smart Campus Problem Detection System — Python AI Backend
==========================================================
Main Application Entry Point

This module initializes the Python AI backend server that handles:
- NLP-based Complaint Classification
- Priority Prediction Engine
- RAG (Retrieval Augmented Generation) Pipeline
- AI Summary Generation
- Google Gemini AI Integration
- Intelligent Chatbot Engine

Tech Stack:
- Python 3.9+
- Vercel Serverless Functions (Python Runtime)
- Google Gemini AI API
- Natural Language Processing (NLP)
- Retrieval Augmented Generation (RAG)

Author: Smart Campus Detection Team
"""

from ai_engine import SmartCampusAI
from gemini_service import GeminiAIService
from rag_pipeline import RAGPipeline
from chatbot_engine import ChatbotEngine
import json


def create_app():
    """
    Factory function to initialize and configure the Python AI backend.
    Sets up all AI services and processing pipelines.
    """
    ai_engine = SmartCampusAI()
    gemini_service = GeminiAIService()
    rag_pipeline = RAGPipeline()
    chatbot = ChatbotEngine()

    print("=" * 60)
    print("Smart Campus AI Backend - Python Server")
    print("=" * 60)
    print(f"AI Engine:      {ai_engine.get_status()}")
    print(f"Gemini Service: {gemini_service.get_status()}")
    print(f"RAG Pipeline:   {rag_pipeline.get_status()}")
    print(f"Chatbot Engine: {chatbot.get_status()}")
    print("=" * 60)

    return {
        'ai_engine': ai_engine,
        'gemini_service': gemini_service,
        'rag_pipeline': rag_pipeline,
        'chatbot': chatbot
    }


if __name__ == '__main__':
    app = create_app()
    print("\n✅ Python AI Backend initialized successfully!")
    print("📡 Serving AI endpoints via Vercel Serverless Functions")
    print("🔗 Endpoint: /api/ai")

    # Quick self-test
    test_text = "The fan in classroom 301 is broken and making noise"
    result = app['ai_engine'].classify(test_text)
    priority = app['ai_engine'].predict_priority(test_text)
    print(f"\n🧪 Self-test:")
    print(f"   Input: '{test_text}'")
    print(f"   Category: {result['category']} ({result['confidence']}% confidence)")
    print(f"   Priority: {priority['level']}")
    print(f"\n✅ All systems operational!")
