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
        'electrocution', 'short circuit', 'theft', 'stolen'
    ]

    MEDIUM_KEYWORDS: List[str] = [
        'broken', 'not working', 'damaged', 'leaking', 'malfunction',
        'faulty', 'intermittent', 'slow', 'frequent', 'recurring'
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
        5. Confidence calculated: min(95, 60 + score * 8)

        Args:
            text: The complaint description text to classify

        Returns:
            dict with 'category' (str) and 'confidence' (int, 60-95)
        """
        lower = text.lower()
        best_category = 'Infrastructure'
        best_score = 0

        for category, keywords in self.CATEGORY_RULES.items():
            score = 0
            for keyword in keywords:
                if keyword in lower:
                    # Multi-word matches score higher for better accuracy
                    score += len(keyword.split())
            if score > best_score:
                best_score = score
                best_category = category

        # Confidence scoring algorithm
        confidence = min(95, 60 + best_score * 8)

        return {
            'category': best_category,
            'confidence': confidence
        }

    def predict_priority(self, text: str) -> Dict:
        """
        Predict complaint priority using NLP urgency detection.

        Scans text for urgency indicators:
        - HIGH: emergency, danger, fire, collapse, injury, etc.
        - MEDIUM: broken, damaged, leaking, malfunctioning, etc.
        - LOW: everything else (minor issues, suggestions)

        Args:
            text: The complaint description text

        Returns:
            dict with 'level' (str) and 'color' (hex color string)
        """
        lower = text.lower()

        # Check for high priority indicators first
        for keyword in self.HIGH_KEYWORDS:
            if keyword in lower:
                return {'level': 'High', 'color': '#ef4444'}

        # Check for medium priority indicators
        for keyword in self.MEDIUM_KEYWORDS:
            if keyword in lower:
                return {'level': 'Medium', 'color': '#f59e0b'}

        # Default: low priority
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
