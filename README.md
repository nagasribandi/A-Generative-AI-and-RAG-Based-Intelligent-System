#  Smart Campus Problem Detection System

A Generative AI and Retrieval-Augmented Generation (RAG) Based Intelligent System is an AI-powered application that combines Large Language Models (LLMs) with a retrieval mechanism to provide accurate, context-aware, and up-to-date responses. Unlike traditional chatbots, the system retrieves relevant information from a knowledge base and uses it to generate meaningful answers.

The project aims to improve response accuracy, reduce hallucinations, and provide users with reliable information based on stored documents

![React](https://img.shields.io/badge/React-18.2-blue) ![Chart.js](https://img.shields.io/badge/Chart.js-4.4-orange) ![AI](https://img.shields.io/badge/GenAI-Powered-purple)

## 🚀 Features

- **🔐 OTP-Verified Signup** — Email OTP verification for student registration
- **🤖 AI Classification** — Auto-classifies complaints into 10 categories with confidence scores
- **⚡ Priority Prediction** — Detects urgency level (High/Medium/Low) from complaint text
- **📚 RAG Pipeline** — Retrieves relevant SOPs and generates step-by-step action plans
- **📧 Auto Email Alerts** — High-priority complaints automatically emailed to admins
- **📊 Interactive Dashboard** — Charts, trends, and analytics for administrators
- **🛡️ Role-Based Access** — Students can only create student accounts; Admin accounts are pre-configured
- **✅ Student Verification** — Roll number format validation (23881A05xx), college ID name matching

## 📋 Tech Stack

- **Frontend:** React 18, React Router, Chart.js, Framer Motion
- **AI Engine:** Custom NLP classification + RAG-based SOP retrieval
- **Email:** EmailJS for OTP and urgent complaint notifications
- **Styling:** Custom CSS with responsive design

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartcampus.edu | admin123 |
| Student | Sign up with valid college details |

## 📝 Student Registration Rules

- Roll Number format: `23881A05XX` (where XX = your number)
- Name must match college ID card (as registered)
- Only **Student** accounts can be created via signup
- Admin accounts are managed by the institution

##  Getting Started

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/smart-campus-detection.git

# Install dependencies
npm install

# Start development server
npm start
```



MIT License - Built for Smart Campus ecosystems.
