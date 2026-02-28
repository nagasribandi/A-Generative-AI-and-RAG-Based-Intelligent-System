"""
Smart Campus AI Engine — NLP Classification & Priority Prediction
================================================================
Core AI module implementing Natural Language Processing (NLP)
for campus complaint classification and priority analysis.

Features:
- Multi-category complaint classification using keyword extraction
- Priority prediction with urgency detection
- Confidence scoring algorithm
- Multi-word phrase matching for improved accuracy
"""

import re
from typing import Dict, List, Tuple


class SmartCampusAI:
    """
    Main AI engine for the Smart Campus Problem Detection System.
    Implements NLP-based classification and priority prediction.
    """

    # =========================================================
    # Category Classification Rules — NLP Keyword Database
    # =========================================================
    CATEGORY_RULES: Dict[str, List[str]] = {
        'Infrastructure': [
            'building', 'wall', 'roof', 'ceiling', 'floor', 'door', 'window',
            'crack', 'broken', 'damage', 'leak', 'repair', 'construction',
            'paint', 'tile', 'stair', 'ramp', 'lift', 'elevator', 'parking'
        ],
        'Electrical': [
            'light', 'electricity', 'power', 'fan', 'ac', 'air conditioning',
            'switch', 'socket', 'wire', 'wiring', 'bulb', 'electrical',
            'voltage', 'generator', 'outage', 'blackout', 'short circuit'
        ],
        'Plumbing': [
            'water', 'pipe', 'tap', 'toilet', 'bathroom', 'washroom',
            'drainage', 'sewage', 'leak', 'plumbing', 'basin', 'sink',
            'shower', 'flush', 'clog', 'blocked drain'
        ],
        'IT & Network': [
            'wifi', 'internet', 'network', 'computer', 'printer', 'projector',
            'software', 'login', 'password', 'server', 'website', 'portal',
            'lab', 'system', 'monitor', 'keyboard', 'mouse', 'lan'
        ],
        'Cleanliness': [
            'clean', 'dirty', 'garbage', 'trash', 'waste', 'dustbin',
            'sweeping', 'mop', 'hygiene', 'pest', 'cockroach', 'rat',
            'insect', 'smell', 'odor', 'stain', 'litter'
        ],
        'Safety & Security': [
            'security', 'guard', 'cctv', 'camera', 'theft', 'stolen',
            'fire', 'extinguisher', 'emergency', 'safety', 'hazard',
            'danger', 'alarm', 'lock', 'key', 'access', 'trespass'
        ],
        'Furniture': [
            'chair', 'desk', 'table', 'bench', 'board', 'whiteboard',
            'blackboard', 'cupboard', 'shelf', 'furniture', 'seat',
            'podium', 'locker'
        ],
        'Academic': [
            'class', 'lecture', 'professor', 'teacher', 'exam', 'grade',
            'syllabus', 'schedule', 'timetable', 'attendance', 'assignment',
            'course', 'faculty', 'lab session'
        ],
        'Hostel': [
            'hostel', 'room', 'roommate', 'mess', 'food', 'canteen',
            'laundry', 'warden', 'curfew', 'visitor', 'dormitory',
            'bed', 'mattress'
        ],
        'Transport': [
            'bus', 'transport', 'shuttle', 'route', 'driver', 'vehicle',
            'parking', 'traffic', 'bicycle', 'bike'
        ]
    }

    # =========================================================
    # Priority Detection Keywords
    # =========================================================
    HIGH_KEYWORDS: List[str] = [
        'urgent', 'emergency', 'fire', 'danger', 'hazard', 'immediate',
        'critical', 'severe', 'flood', 'collapse', 'injury', 'broken glass',
        'electrocution', 'short circuit', 'theft', 'stolen',
        'life threatening', 'unconscious', 'accident', 'explosion',
        'gas leak', 'live wire', 'sparking', 'attacked', 'assault',
        'bleeding', 'trapped', 'stuck in elevator', 'smoke', 'toxic',
        'structural damage', 'ceiling fell', 'wall crack', 'sinkhole',
        'electric shock'
    ]

    MEDIUM_KEYWORDS: List[str] = [
        'broken', 'not working', 'damaged', 'leaking', 'malfunction',
        'faulty', 'intermittent', 'slow', 'frequent', 'recurring',
        'problem', 'issue', 'trouble', 'complaint', 'poor', 'bad',
        'fail', 'failed', 'failure', 'stuck', 'jammed', 'noisy', 'noise',
        'vibration', 'flickering', 'erratic', 'inconsistent', 'unreliable',
        'defective', 'worn out', 'rusted', 'corroded', 'cracked', 'chipped',
        'peeling', 'stained', 'overflowing', 'clogged', 'blocked',
        'overcrowded', 'insufficient', 'inadequate', 'missing', 'absent',
        'unavailable', 'delayed', 'late', 'irregular', 'disruptive',
        'affecting', 'hindering', 'preventing', 'unable to', 'cannot',
        "doesn't work", 'does not work', 'stopped working', 'out of order',
        'need repair', 'needs fixing', 'please fix', 'help', 'seriously',
        'very bad', 'terrible', 'horrible', 'disgusting', 'unbearable',
        'unacceptable', 'pathetic', 'worst', 'since long', 'many days',
        'weeks', 'no response', 'multiple times', 'again and again',
        'still not', 'yet to be', 'pending', 'ignored', 'no action',
        'several complaints'
    ]

    def __init__(self):
        """Initialize the Smart Campus AI Engine."""
        self.categories = list(self.CATEGORY_RULES.keys())
        self.total_keywords = sum(len(kw) for kw in self.CATEGORY_RULES.values())

    def get_status(self) -> str:
        """Return engine status information."""
        return f"Active — {len(self.categories)} categories, {self.total_keywords} keywords loaded"

    def classify(self, text: str) -> Dict:
        """
        Classify a complaint into one of 10 campus categories using NLP.

        Algorithm:
        1. Convert text to lowercase for case-insensitive matching
        2. Scan against all category keyword lists
        3. Multi-word keywords score higher (phrase matching)
        4. Category with highest cumulative score wins
        5. Confidence uses improved formula with specificity bonus

        Args:
            text: The complaint description text to classify

        Returns:
            dict with 'category' (str) and 'confidence' (int, 55-96)
        """
        lower = text.lower()
        best_category = 'Infrastructure'
        best_score = 0
        all_scores = {}

        for category, keywords in self.CATEGORY_RULES.items():
            score = 0
            for keyword in keywords:
                if keyword in lower:
                    score += len(keyword.split())
            all_scores[category] = score
            if score > best_score:
                best_score = score
                best_category = category

        # Improved confidence formula
        sorted_scores = sorted(all_scores.values(), reverse=True)
        second_best = sorted_scores[1] if len(sorted_scores) > 1 else 0
        gap = best_score - second_best

        if best_score == 0:
            confidence = 55
        else:
            keyword_contrib = min(20, best_score * 5)
            specificity_bonus = min(10, gap * 4)
            text_length_bonus = min(5, len(text.split()) // 10)
            confidence = min(96, 62 + keyword_contrib + specificity_bonus + text_length_bonus)

        return {
            'category': best_category,
            'confidence': confidence
        }

    def predict_priority(self, text: str) -> Dict:
        """
        Predict complaint priority using NLP urgency detection.

        Scans text for urgency indicators, severity markers, and
        contextual signals like negation and complaint language.

        Args:
            text: The complaint description text

        Returns:
            dict with 'level' (str) and 'color' (hex color string)
        """
        lower = text.lower()

        # Check for high priority indicators
        if any(keyword in lower for keyword in self.HIGH_KEYWORDS):
            return {'level': 'High', 'color': '#ef4444'}

        # Check for medium priority indicators
        if any(keyword in lower for keyword in self.MEDIUM_KEYWORDS):
            return {'level': 'Medium', 'color': '#f59e0b'}

        # Contextual signals
        word_count = len(text.split())
        has_exclamation = '!' in text
        negative_words = ['not', 'no', 'never', 'nothing', "don't", "doesn't",
                         "won't", "can't", "couldn't", "isn't", "aren't"]
        has_negative = any(w in lower for w in negative_words)
        complaint_words = ['need', 'want', 'require', 'request', 'fix', 'resolve',
                          'address', 'attend', 'look into', 'kindly', 'please',
                          'asap', 'soon', 'quickly']
        has_complaint = any(w in lower for w in complaint_words)

        if word_count >= 8 and (has_negative or has_complaint):
            return {'level': 'Medium', 'color': '#f59e0b'}
        if has_exclamation and word_count >= 5:
            return {'level': 'Medium', 'color': '#f59e0b'}

        return {'level': 'Low', 'color': '#22c55e'}

    def analyze(self, text: str) -> Dict:
        """
        Perform full NLP analysis on a complaint.
        Combines classification and priority prediction.

        Args:
            text: The complaint description text

        Returns:
            dict with classification and priority results
        """
        classification = self.classify(text)
        priority = self.predict_priority(text)

        return {
            'classification': classification,
            'priority': priority,
            'text_length': len(text),
            'word_count': len(text.split())
        }

    def generate_summary(self, text: str, category: str, priority: str) -> str:
        """
        Generate an AI-powered summary for a classified complaint.

        Creates contextual summaries based on the category and
        priority level, with appropriate urgency indicators.

        Args:
            text: Original complaint text
            category: Classified category name
            priority: Priority level (High/Medium/Low)

        Returns:
            Summary string with emoji indicators
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
