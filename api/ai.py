"""
Smart Campus Problem Detection System — Python AI Backend
==========================================================
Vercel Serverless Function (Python Runtime)
Handles: Classification, Priority Prediction, RAG, Summary Generation, Chatbot
"""

from http.server import BaseHTTPRequestHandler
import json
import re
import os
import urllib.request
import urllib.error

# =====================================================
# AI Classification Engine — NLP + Rule-Based
# =====================================================

CATEGORY_RULES = {
    'Infrastructure': ['building', 'wall', 'roof', 'ceiling', 'floor', 'door', 'window', 'crack', 'broken', 'damage', 'leak', 'repair', 'construction', 'paint', 'tile', 'stair', 'ramp', 'lift', 'elevator', 'parking'],
    'Electrical': ['light', 'electricity', 'power', 'fan', 'ac', 'air conditioning', 'switch', 'socket', 'wire', 'wiring', 'bulb', 'electrical', 'voltage', 'generator', 'outage', 'blackout', 'short circuit'],
    'Plumbing': ['water', 'pipe', 'tap', 'toilet', 'bathroom', 'washroom', 'drainage', 'sewage', 'leak', 'plumbing', 'basin', 'sink', 'shower', 'flush', 'clog', 'blocked drain'],
    'IT & Network': ['wifi', 'internet', 'network', 'computer', 'printer', 'projector', 'software', 'login', 'password', 'server', 'website', 'portal', 'lab', 'system', 'monitor', 'keyboard', 'mouse', 'lan'],
    'Cleanliness': ['clean', 'dirty', 'garbage', 'trash', 'waste', 'dustbin', 'sweeping', 'mop', 'hygiene', 'pest', 'cockroach', 'rat', 'insect', 'smell', 'odor', 'stain', 'litter'],
    'Safety & Security': ['security', 'guard', 'cctv', 'camera', 'theft', 'stolen', 'fire', 'extinguisher', 'emergency', 'safety', 'hazard', 'danger', 'alarm', 'lock', 'key', 'access', 'trespass'],
    'Furniture': ['chair', 'desk', 'table', 'bench', 'board', 'whiteboard', 'blackboard', 'cupboard', 'shelf', 'furniture', 'seat', 'podium', 'locker'],
    'Academic': ['class', 'lecture', 'professor', 'teacher', 'exam', 'grade', 'syllabus', 'schedule', 'timetable', 'attendance', 'assignment', 'course', 'faculty', 'lab session'],
    'Hostel': ['hostel', 'room', 'roommate', 'mess', 'food', 'canteen', 'laundry', 'warden', 'curfew', 'visitor', 'dormitory', 'bed', 'mattress'],
    'Transport': ['bus', 'transport', 'shuttle', 'route', 'driver', 'vehicle', 'parking', 'traffic', 'bicycle', 'bike']
}

HIGH_KEYWORDS = ['urgent', 'emergency', 'fire', 'danger', 'hazard', 'immediate', 'critical', 'severe', 'flood', 'collapse', 'injury', 'broken glass', 'electrocution', 'short circuit', 'theft', 'stolen']
MEDIUM_KEYWORDS = ['broken', 'not working', 'damaged', 'leaking', 'malfunction', 'faulty', 'intermittent', 'slow', 'frequent', 'recurring']

# SOP Database for RAG (Retrieval Augmented Generation)
SOP_DATABASE = {
    'Infrastructure': {
        'sops': [
            'SOP-INF-001: Building Maintenance Protocol',
            'SOP-INF-002: Structural Damage Assessment Guide',
            'SOP-INF-003: Emergency Repair Procedures'
        ],
        'actionPlan': [
            'Dispatch maintenance team to inspect the reported area within 2 hours',
            'Document damage with photographs and written assessment',
            'Classify severity: Minor (patch repair), Moderate (section repair), Major (structural intervention)',
            'If structural risk detected, cordon off the area immediately and notify safety officer',
            'Create work order with estimated timeline and resource requirements',
            'Assign to appropriate contractor or in-house maintenance crew',
            'Schedule follow-up inspection after repair completion',
            'Update facility maintenance log and notify complainant of resolution'
        ]
    },
    'Electrical': {
        'sops': [
            'SOP-ELE-001: Electrical Fault Response Protocol',
            'SOP-ELE-002: Power Outage Management',
            'SOP-ELE-003: AC/HVAC Maintenance Schedule'
        ],
        'actionPlan': [
            'Log the electrical complaint and verify location details',
            'Check if the issue affects a single unit or entire zone/building',
            'For safety hazards (exposed wires, sparking): immediately cut power to affected circuit',
            'Dispatch certified electrician within 1 hour for high-priority, 4 hours for standard',
            'Perform root cause analysis (overload, faulty wiring, equipment failure)',
            'Replace/repair faulty components following electrical safety codes',
            'Test the repair thoroughly before restoring service',
            'Document the fix in the electrical maintenance register'
        ]
    },
    'Plumbing': {
        'sops': [
            'SOP-PLB-001: Water Leakage Response',
            'SOP-PLB-002: Drainage Blockage Resolution',
            'SOP-PLB-003: Water Supply Management'
        ],
        'actionPlan': [
            'Acknowledge the plumbing complaint and locate the exact issue point',
            'For active leaks: shut off the nearest water valve to prevent further damage',
            'Dispatch plumbing team with appropriate tools and replacement parts',
            'Assess whether the issue is localized or part of a larger plumbing infrastructure problem',
            'Perform repair: pipe replacement, seal application, or drain clearing',
            'Test water flow and check for secondary damage (water damage to walls/floors)',
            'If recurrent issue, schedule comprehensive plumbing audit for the building',
            'Confirm resolution with complainant and update maintenance records'
        ]
    },
    'IT & Network': {
        'sops': [
            'SOP-IT-001: Network Connectivity Troubleshooting',
            'SOP-IT-002: Hardware Repair/Replacement Protocol',
            'SOP-IT-003: Software & Account Management'
        ],
        'actionPlan': [
            'Log the IT issue with device/system details and user information',
            'Perform initial remote diagnosis (ping test, connectivity check, system logs)',
            'For network issues: check router/switch status, verify DHCP/DNS configuration',
            'For hardware: dispatch IT technician to inspect and diagnose on-site',
            'If equipment replacement needed, process through IT asset management system',
            'For software issues: check for updates, reinstall, or escalate to vendor support',
            'Test the solution and confirm service restoration',
            'Update IT asset registry and close the ticket with resolution notes'
        ]
    },
    'Cleanliness': {
        'sops': [
            'SOP-CLN-001: Routine Cleaning Schedule',
            'SOP-CLN-002: Special Cleaning Request Protocol',
            'SOP-CLN-003: Pest Control Management'
        ],
        'actionPlan': [
            'Acknowledge cleanliness complaint and identify specific location and issue type',
            'Dispatch housekeeping staff to the reported area within 30 minutes',
            'For pest issues: contact authorized pest control vendor for assessment',
            'Perform thorough cleaning/sanitization of the affected area',
            'Place appropriate signage during and after cleaning',
            'Review cleaning schedule for the area and adjust frequency if needed',
            'For recurring issues: conduct root cause analysis (waste management, drainage, etc.)',
            'Verify cleanliness standards are met and notify complainant'
        ]
    },
    'Safety & Security': {
        'sops': [
            'SOP-SEC-001: Emergency Response Protocol',
            'SOP-SEC-002: Theft/Loss Report Procedure',
            'SOP-SEC-003: CCTV & Access Control Management'
        ],
        'actionPlan': [
            'IMMEDIATE: Assess threat level and activate appropriate emergency protocol if needed',
            'For active emergencies: contact campus security control room and local authorities',
            'Secure the affected area and ensure safety of all personnel',
            'For theft: preserve evidence, review CCTV footage, file official report',
            'For fire safety: inspect fire extinguishers, alarms, and evacuation routes',
            'Deploy additional security personnel to the area if needed',
            'Conduct incident investigation and prepare detailed report',
            'Implement preventive measures and update security protocols as needed'
        ]
    },
    'Furniture': {
        'sops': [
            'SOP-FUR-001: Furniture Repair/Replacement Protocol',
            'SOP-FUR-002: Classroom Equipment Maintenance'
        ],
        'actionPlan': [
            'Log the furniture complaint with location and item details',
            'Inspect the furniture item to determine if repair or replacement is needed',
            'For repairable items: send to maintenance workshop with work order',
            'For replacement: process requisition through procurement department',
            'Provide temporary alternative seating/furniture if available',
            'Install repaired/new furniture and remove damaged items',
            'Update furniture inventory register',
            'Confirm resolution with the complainant'
        ]
    },
    'Academic': {
        'sops': [
            'SOP-ACD-001: Academic Complaint Resolution',
            'SOP-ACD-002: Faculty/Course Issue Escalation'
        ],
        'actionPlan': [
            'Register the academic complaint and assign a case reference number',
            'Forward to the relevant department head or academic coordinator',
            'Schedule a meeting with the student to understand the concern in detail',
            'Review relevant academic records, schedules, or policies',
            'Mediate between student and faculty if needed',
            'Propose a resolution in accordance with academic regulations',
            'Implement the agreed-upon resolution and document the outcome',
            'Follow up with the student within one week to ensure satisfaction'
        ]
    },
    'Hostel': {
        'sops': [
            'SOP-HST-001: Hostel Facility Maintenance',
            'SOP-HST-002: Mess/Food Quality Management',
            'SOP-HST-003: Hostel Discipline & Welfare'
        ],
        'actionPlan': [
            'Acknowledge the hostel complaint and verify student residence details',
            'For facility issues: dispatch hostel maintenance team for inspection',
            'For food/mess complaints: notify mess committee and kitchen supervisor',
            'For roommate/discipline issues: arrange meeting with hostel warden',
            'Implement immediate corrective action where possible',
            'For recurring issues: escalate to hostel administration committee',
            'Document resolution and preventive measures taken',
            'Follow up with resident student within 48 hours'
        ]
    },
    'Transport': {
        'sops': [
            'SOP-TRN-001: Transport Service Complaint Handling',
            'SOP-TRN-002: Route & Schedule Management'
        ],
        'actionPlan': [
            'Log the transport complaint with route, time, and specific issue details',
            'Contact transport supervisor to verify and investigate the complaint',
            'For vehicle condition issues: schedule immediate vehicle inspection',
            'For route/timing issues: review and optimize the route/schedule',
            'For driver behavior: initiate disciplinary review process',
            'Implement corrective measures and inform all affected commuters',
            'Monitor the route/service for improvements over the next week',
            'Update complainant on actions taken and resolution status'
        ]
    }
}

# =====================================================
# NLP Classification Functions
# =====================================================

def classify_complaint(text: str) -> dict:
    """
    NLP-based complaint classification using keyword matching
    with multi-word scoring for higher accuracy.
    """
    lower = text.lower()
    best_category = 'Infrastructure'
    best_score = 0

    for category, keywords in CATEGORY_RULES.items():
        score = 0
        for keyword in keywords:
            if keyword in lower:
                score += len(keyword.split())  # Multi-word matches score higher
        if score > best_score:
            best_score = score
            best_category = category

    confidence = min(95, 60 + best_score * 8)
    return {'category': best_category, 'confidence': confidence}


def predict_priority(text: str) -> dict:
    """
    Priority prediction using NLP keyword analysis.
    Scans for urgency indicators and severity markers.
    """
    lower = text.lower()

    for keyword in HIGH_KEYWORDS:
        if keyword in lower:
            return {'level': 'High', 'color': '#ef4444'}

    for keyword in MEDIUM_KEYWORDS:
        if keyword in lower:
            return {'level': 'Medium', 'color': '#f59e0b'}

    return {'level': 'Low', 'color': '#22c55e'}


def generate_rag_response(category: str) -> dict:
    """
    Retrieval Augmented Generation (RAG) response.
    Retrieves SOPs and action plans from the knowledge base
    based on the classified complaint category.
    """
    data = SOP_DATABASE.get(category, SOP_DATABASE['Infrastructure'])
    return {
        'sops': data['sops'],
        'actionPlan': data['actionPlan'],
        'generatedSummary': (
            f'Based on the complaint classified under "{category}", '
            f'the system has retrieved {len(data["sops"])} relevant Standard Operating Procedures '
            f'and generated a {len(data["actionPlan"])}-step action plan. '
            f'The resolution follows established campus maintenance protocols '
            f'and best practices for {category.lower()} management.'
        )
    }


def generate_ai_summary(text: str, category: str, priority: str) -> str:
    """
    Generates AI-powered summary based on complaint analysis.
    Uses priority level and category to produce contextual summaries.
    """
    summaries = {
        'High': (
            f'⚠️ URGENT: This {category.lower()} issue requires immediate attention. '
            f'The complaint indicates a potentially serious problem that could affect '
            f'campus safety or operations. Priority dispatch has been recommended.'
        ),
        'Medium': (
            f'📋 This {category.lower()} complaint requires standard response. '
            f'The issue has been identified as a recurring or notable problem that '
            f'should be addressed within the standard service window to prevent escalation.'
        ),
        'Low': (
            f'ℹ️ This {category.lower()} matter has been logged for routine handling. '
            f'The complaint describes a minor issue that can be scheduled for the '
            f'next maintenance cycle without immediate impact on campus operations.'
        )
    }
    return summaries.get(priority, summaries['Low'])


# =====================================================
# Gemini AI Integration (Enhanced NLP)
# =====================================================

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', os.environ.get('REACT_APP_GEMINI_API_KEY', ''))
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'


def call_gemini(prompt: str, temperature: float = 0.3) -> str:
    """Call Gemini API for enhanced NLP processing."""
    if not GEMINI_API_KEY:
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
        f'{GEMINI_API_URL}?key={GEMINI_API_KEY}',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            if not text:
                raise Exception('Empty Gemini response')
            return text.strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        raise Exception(f'Gemini API error {e.code}: {body[:200]}')


def gemini_classify(description: str) -> dict:
    """Use Gemini AI for enhanced complaint classification."""
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

    raw = call_gemini(prompt, 0.1)
    match = re.search(r'\{[\s\S]*?\}', raw)
    if not match:
        raise Exception('Invalid classification response')
    parsed = json.loads(match.group())

    valid = ['Infrastructure', 'Electrical', 'Plumbing', 'IT & Network', 'Cleanliness',
             'Safety & Security', 'Furniture', 'Academic', 'Hostel', 'Transport']
    if parsed.get('category') not in valid:
        raise Exception('Invalid category returned')

    return {
        'category': parsed['category'],
        'confidence': min(98, max(60, parsed.get('confidence', 80))),
        'source': 'gemini'
    }


def gemini_priority(description: str) -> dict:
    """Use Gemini AI for enhanced priority prediction."""
    prompt = f"""You are an AI for a campus complaint system at Vardhaman College of Engineering.
Analyze this complaint and determine its priority level.

Rules:
- "High" = safety risks, emergencies, fire, flooding, electrical hazards, structural damage, theft, anything that could harm people
- "Medium" = broken equipment, recurring issues, things that disrupt daily activities but aren't dangerous
- "Low" = minor inconveniences, cosmetic issues, suggestions, things that can wait

Complaint: "{description}"

Respond in EXACTLY this JSON format, no extra text:
{{"level": "High", "reasoning": "Brief 1-line reason"}}"""

    raw = call_gemini(prompt, 0.1)
    match = re.search(r'\{[\s\S]*?\}', raw)
    if not match:
        raise Exception('Invalid priority response')
    parsed = json.loads(match.group())

    colors = {'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#22c55e'}
    level = parsed.get('level', 'Medium')
    if level not in colors:
        level = 'Medium'

    return {
        'level': level,
        'color': colors[level],
        'reasoning': parsed.get('reasoning', ''),
        'source': 'gemini'
    }


def gemini_summary(description: str, category: str, priority: str) -> dict:
    """Use Gemini AI for enhanced summary generation."""
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

    text = call_gemini(prompt, 0.5)
    return {'summary': text, 'source': 'gemini'}


def gemini_rag(description: str, category: str, sop_data: dict) -> dict:
    """Use Gemini AI for enhanced RAG response generation."""
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

Now generate a CUSTOMIZED 6-8 step action plan specifically tailored to this complaint. Each step should be concrete and reference the specific issue described. Also generate a 2-sentence RAG summary.

Respond in EXACTLY this JSON format:
{{
  "actionPlan": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5...", "Step 6..."],
  "generatedSummary": "Your 2-sentence RAG retrieval summary here."
}}"""

    raw = call_gemini(prompt, 0.4)
    match = re.search(r'\{[\s\S]*\}', raw)
    if not match:
        raise Exception('Invalid RAG response')
    parsed = json.loads(match.group())

    return {
        'sops': sop_data['sops'],
        'actionPlan': parsed.get('actionPlan', sop_data['actionPlan']),
        'generatedSummary': parsed.get('generatedSummary', sop_data['generatedSummary']),
        'source': 'gemini'
    }


def gemini_chat(user_message: str, conversation_history: list, campus_stats: dict) -> dict:
    """Use Gemini AI for intelligent chatbot responses."""
    history_lines = []
    for m in (conversation_history or [])[-6:]:
        role = 'Student' if m.get('sender') == 'user' else 'AI'
        history_lines.append(f'{role}: {m.get("text", "")}')
    history_text = '\n'.join(history_lines)

    prompt = f"""You are an AI chatbot assistant for the Smart Campus Problem Detection System at Vardhaman College of Engineering, Shamshabad, Telangana.

Your role:
- Help students file campus complaints (infrastructure, electrical, plumbing, IT, cleanliness, safety, furniture, academic, hostel, transport)
- Answer questions about the campus complaint system
- Analyze campus issues when students describe problems
- Provide campus statistics when asked
- Guide users to the right page (Dashboard, Submit Complaint, Complaints, Campus Heatmap, Leaderboard, Analytics, Profile)

Campus Stats:
- Total complaints: {campus_stats.get('total', 0)}
- Open: {campus_stats.get('open', 0)}
- In Progress: {campus_stats.get('inProgress', 0)}
- Resolved: {campus_stats.get('resolved', 0)}

Recent conversation:
{history_text}

Student's message: "{user_message}"

Instructions:
- Be helpful, friendly, and concise (max 4-5 sentences unless asked for detail)
- Use emojis naturally
- If the student describes a campus problem, classify it into one of the 10 categories and suggest they file it
- If they want to navigate somewhere, mention the page name
- If you don't know something, say so honestly
- Remember this is a COLLEGE campus system, not a general chatbot

Respond directly as the AI assistant:"""

    text = call_gemini(prompt, 0.7)
    return {'text': text, 'source': 'gemini'}


# =====================================================
# Full Analysis Pipeline (Gemini + Rule-Based Fallback)
# =====================================================

def full_analysis(description: str) -> dict:
    """
    Complete AI analysis pipeline. Uses Gemini AI when available,
    falls back to rule-based NLP engine for reliability.
    """
    results = {'source': 'gemini', 'errors': []}

    # 1. Classification
    try:
        results['classification'] = gemini_classify(description)
    except Exception as e:
        results['errors'].append(f'Classification: {str(e)}')
        classification = classify_complaint(description)
        classification['source'] = 'rule-based'
        results['classification'] = classification

    # 2. Priority
    try:
        results['priority'] = gemini_priority(description)
    except Exception as e:
        results['errors'].append(f'Priority: {str(e)}')
        priority = predict_priority(description)
        priority['source'] = 'rule-based'
        results['priority'] = priority

    # 3. RAG
    try:
        sop_data = generate_rag_response(results['classification']['category'])
        results['ragResponse'] = gemini_rag(description, results['classification']['category'], sop_data)
    except Exception as e:
        results['errors'].append(f'RAG: {str(e)}')
        rag = generate_rag_response(results['classification']['category'])
        rag['source'] = 'rule-based'
        results['ragResponse'] = rag

    # 4. Summary
    try:
        summary_result = gemini_summary(description, results['classification']['category'], results['priority']['level'])
        results['summary'] = summary_result['summary']
    except Exception as e:
        results['errors'].append(f'Summary: {str(e)}')
        results['summary'] = generate_ai_summary(description, results['classification']['category'], results['priority']['level'])

    # Determine overall source
    error_count = len(results['errors'])
    if error_count == 0:
        results['source'] = 'gemini'
    elif error_count == 4:
        results['source'] = 'rule-based'
    else:
        results['source'] = 'hybrid'

    return results


# =====================================================
# Vercel Serverless Handler
# =====================================================

class handler(BaseHTTPRequestHandler):
    """
    Vercel Python Serverless Function Handler.
    Routes AI requests to the appropriate processing function.
    """

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Process AI analysis requests."""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8')) if body else {}

            action = data.get('action', '')

            # Route to appropriate AI function
            if action == 'classify':
                result = classify_complaint(data.get('text', ''))
                result['source'] = 'rule-based'

            elif action == 'priority':
                result = predict_priority(data.get('text', ''))
                result['source'] = 'rule-based'

            elif action == 'rag':
                result = generate_rag_response(data.get('category', 'Infrastructure'))
                result['source'] = 'rule-based'

            elif action == 'summary':
                text = data.get('text', '')
                category = data.get('category', 'Infrastructure')
                priority = data.get('priority', 'Low')
                result = {'summary': generate_ai_summary(text, category, priority), 'source': 'rule-based'}

            elif action == 'full_analysis':
                result = full_analysis(data.get('text', ''))

            elif action == 'gemini_classify':
                result = gemini_classify(data.get('text', ''))

            elif action == 'gemini_priority':
                result = gemini_priority(data.get('text', ''))

            elif action == 'gemini_summary':
                result = gemini_summary(data.get('text', ''), data.get('category', ''), data.get('priority', ''))

            elif action == 'gemini_rag':
                sop_data = generate_rag_response(data.get('category', 'Infrastructure'))
                result = gemini_rag(data.get('text', ''), data.get('category', ''), sop_data)

            elif action == 'gemini_chat':
                result = gemini_chat(
                    data.get('message', ''),
                    data.get('history', []),
                    data.get('stats', {})
                )

            elif action == 'health':
                result = {
                    'status': 'ok',
                    'engine': 'Python AI Backend',
                    'version': '1.0.0',
                    'gemini_configured': bool(GEMINI_API_KEY),
                    'capabilities': [
                        'NLP Classification',
                        'Priority Prediction',
                        'RAG Response Generation',
                        'AI Summary Generation',
                        'Gemini AI Integration',
                        'Intelligent Chatbot'
                    ]
                }

            else:
                result = {'error': f'Unknown action: {action}', 'available_actions': [
                    'classify', 'priority', 'rag', 'summary', 'full_analysis',
                    'gemini_classify', 'gemini_priority', 'gemini_summary',
                    'gemini_rag', 'gemini_chat', 'health'
                ]}

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_result = {'error': str(e), 'source': 'python-backend'}
            self.wfile.write(json.dumps(error_result).encode('utf-8'))
