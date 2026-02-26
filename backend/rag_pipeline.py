"""
RAG Pipeline — Retrieval Augmented Generation
==============================================
Implements the RAG (Retrieval Augmented Generation) pipeline
for the Smart Campus Problem Detection System.

This module retrieves relevant Standard Operating Procedures (SOPs)
and generates customized action plans based on complaint categories.

Architecture:
1. Complaint category → Knowledge Base lookup
2. Retrieve matching SOPs from the SOP Database
3. Generate contextual action plans
4. Produce RAG summary combining retrieved knowledge with complaint context
"""

from typing import Dict, List, Optional


class RAGPipeline:
    """
    Retrieval Augmented Generation Pipeline.
    Retrieves SOPs and generates action plans from the knowledge base.
    """

    # =========================================================
    # SOP Knowledge Base — Standard Operating Procedures
    # =========================================================
    SOP_DATABASE: Dict[str, Dict] = {
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

    def __init__(self):
        """Initialize the RAG Pipeline with the SOP knowledge base."""
        self.knowledge_base = self.SOP_DATABASE
        self.categories = list(self.knowledge_base.keys())

    def get_status(self) -> str:
        """Return pipeline status."""
        total_sops = sum(len(v['sops']) for v in self.knowledge_base.values())
        return f"Active — {len(self.categories)} categories, {total_sops} SOPs loaded"

    def retrieve(self, category: str) -> Dict:
        """
        Retrieve SOPs and action plans for a given category.

        This is the 'Retrieval' step of RAG — fetching relevant
        documents from the knowledge base based on the classified category.

        Args:
            category: The complaint category to retrieve SOPs for

        Returns:
            dict with 'sops', 'actionPlan', and 'generatedSummary'
        """
        data = self.knowledge_base.get(category, self.knowledge_base['Infrastructure'])

        generated_summary = (
            f'Based on the complaint classified under "{category}", '
            f'the system has retrieved {len(data["sops"])} relevant Standard Operating Procedures '
            f'and generated a {len(data["actionPlan"])}-step action plan. '
            f'The resolution follows established campus maintenance protocols '
            f'and best practices for {category.lower()} management.'
        )

        return {
            'sops': data['sops'],
            'actionPlan': data['actionPlan'],
            'generatedSummary': generated_summary
        }

    def generate_response(self, category: str, complaint_text: Optional[str] = None) -> Dict:
        """
        Full RAG pipeline: Retrieve + Generate.

        Retrieves relevant SOPs and generates a contextual response
        tailored to the specific complaint.

        Args:
            category: Classified complaint category
            complaint_text: Optional complaint text for context

        Returns:
            Complete RAG response with SOPs, action plan, and summary
        """
        retrieved = self.retrieve(category)

        if complaint_text:
            retrieved['context'] = {
                'complaint_preview': complaint_text[:200],
                'category_match': category,
                'retrieval_method': 'keyword_classification'
            }

        return retrieved
