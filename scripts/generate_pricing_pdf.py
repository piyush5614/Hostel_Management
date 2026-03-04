"""
TC Hostel Connect — Pricing PDF Generator
Generates a professional pricing document for college sales.
Run: python scripts/generate_pricing_pdf.py
Requires: fpdf2  (pip install fpdf2)
"""

import os
from fpdf import FPDF

# ── Colour palette ──────────────────────────────────────────────────
PRIMARY = (30, 64, 175)       # #1e40af
ACCENT = (59, 130, 246)       # #3b82f6
LIGHT_BG = (235, 241, 253)    # light blue background
WHITE = (255, 255, 255)
BLACK = (30, 30, 30)
GRAY = (100, 100, 100)
DARK_GRAY = (60, 60, 60)
BORDER_GRAY = (200, 200, 210)
GREEN_CHECK = (16, 120, 60)
PRICE_BG = (245, 247, 255)

# ── Helpers ─────────────────────────────────────────────────────────

class PricingPDF(FPDF):
    """Custom PDF with branded header / footer."""

    page_label = ""       # optional per-page section label

    # ── Footer ──────────────────────────────────────────────────────
    def footer(self):
        self.set_y(-18)
        self.set_draw_color(*BORDER_GRAY)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 6, f"TC Hostel Connect  |  Confidential", 0, 0, "L")
        self.cell(0, 6, f"Page {self.page_no()}", 0, 0, "R")

    # ── Reusable elements ───────────────────────────────────────────
    def section_title(self, text: str, *, size: int = 16):
        """Draw a blue-background section title bar."""
        self.set_fill_color(*PRIMARY)
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", size)
        self.cell(0, 12, f"  {text}", ln=True, fill=True)
        self.ln(4)
        self.set_text_color(*BLACK)

    def sub_heading(self, text: str, *, size: int = 13):
        self.set_font("Helvetica", "B", size)
        self.set_text_color(*PRIMARY)
        self.cell(0, 9, text, ln=True)
        self.set_text_color(*BLACK)
        self.ln(1)

    def body(self, text: str, *, size: int = 10, style: str = ""):
        self.set_font("Helvetica", style, size)
        self.set_text_color(*DARK_GRAY)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text: str, *, indent: float = 12, bullet_char: str = ">"):
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*GREEN_CHECK)
        self.cell(indent, 6, bullet_char)
        self.set_text_color(*DARK_GRAY)
        self.multi_cell(0, 6, text)
        self.set_x(x)

    def check_bullet(self, text: str, *, indent: float = 12):
        self.bullet(text, indent=indent, bullet_char="*")

    def hr(self):
        self.set_draw_color(*BORDER_GRAY)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(4)

    def spacer(self, h: float = 4):
        self.ln(h)

    def pricing_box(self, tier: str, price: str, subtitle: str, items: list, *, highlight: bool = False):
        """Draw a pricing tier box."""
        x_start = self.get_x()
        y_start = self.get_y()
        box_w = 180
        # Estimate height
        line_h = 6
        header_h = 22
        content_h = len(items) * (line_h + 1) + 8
        total_h = header_h + content_h

        # Check page break
        if self.get_y() + total_h > 270:
            self.add_page()
            y_start = self.get_y()

        # Box border
        if highlight:
            self.set_draw_color(*PRIMARY)
            self.set_line_width(0.6)
        else:
            self.set_draw_color(*BORDER_GRAY)
            self.set_line_width(0.3)
        self.set_fill_color(*(LIGHT_BG if highlight else PRICE_BG))
        self.rect(15, y_start, box_w, total_h, "DF")

        # Header band
        self.set_fill_color(*(PRIMARY if highlight else ACCENT))
        self.rect(15, y_start, box_w, header_h, "F")

        # Tier name + price
        self.set_xy(18, y_start + 2)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(100, 8, tier)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, price, align="R")
        self.ln()
        self.set_x(18)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(220, 225, 245)
        self.cell(0, 6, subtitle)

        # Items
        self.set_xy(20, y_start + header_h + 4)
        self.set_text_color(*DARK_GRAY)
        for item in items:
            self.set_x(20)
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*GREEN_CHECK)
            self.cell(8, line_h, "*")
            self.set_text_color(*DARK_GRAY)
            self.cell(0, line_h, item, ln=True)
            self.ln(0.5)

        self.set_y(y_start + total_h + 6)
        self.set_line_width(0.2)

    def amc_row(self, tier: str, price: str, features: str):
        self.set_fill_color(*LIGHT_BG)
        y = self.get_y()
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*PRIMARY)
        self.cell(45, 7, tier, ln=False)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*BLACK)
        self.cell(40, 7, price, ln=False)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*DARK_GRAY)
        self.multi_cell(0, 7, features)
        self.ln(1)
        self.hr()


# ═════════════════════════════════════════════════════════════════════
# Build PDF
# ═════════════════════════════════════════════════════════════════════

pdf = PricingPDF(orientation="P", unit="mm", format="A4")
pdf.set_auto_page_break(auto=True, margin=22)
pdf.set_margins(15, 15, 15)

# ── PAGE 1 — Cover ──────────────────────────────────────────────────
pdf.add_page()
pdf.ln(50)

# Accent line
pdf.set_fill_color(*PRIMARY)
pdf.rect(15, 60, 180, 3, "F")

pdf.ln(15)
pdf.set_font("Helvetica", "B", 36)
pdf.set_text_color(*PRIMARY)
pdf.cell(0, 18, "TC Hostel Connect", ln=True, align="C")

pdf.set_font("Helvetica", "", 18)
pdf.set_text_color(*ACCENT)
pdf.cell(0, 12, "Complete Hostel Management System", ln=True, align="C")

pdf.ln(6)
pdf.set_font("Helvetica", "B", 14)
pdf.set_text_color(*DARK_GRAY)
pdf.cell(0, 10, "Smart.  Secure.  Scalable.", ln=True, align="C")

pdf.ln(12)
pdf.set_draw_color(*ACCENT)
pdf.set_line_width(0.5)
pdf.line(70, pdf.get_y(), 140, pdf.get_y())
pdf.ln(12)

pdf.set_font("Helvetica", "", 13)
pdf.set_text_color(*GRAY)
pdf.cell(0, 8, "Pricing & Proposal Document", ln=True, align="C")
pdf.cell(0, 8, "March 2026", ln=True, align="C")

pdf.ln(40)
pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(*GRAY)
pdf.cell(0, 8, "Confidential - For authorized recipients only", ln=True, align="C")

# Bottom accent bar
pdf.set_fill_color(*ACCENT)
pdf.rect(15, 275, 180, 3, "F")


# ── PAGE 2 — Executive Summary ──────────────────────────────────────
pdf.add_page()
pdf.section_title("Executive Summary")
pdf.body(
    "TC Hostel Connect is a modern, full-featured hostel management platform "
    "with 18+ integrated modules. It provides role-based access for Admins, "
    "Wardens, Staff, and Students - covering everything from room allocation "
    "and attendance to leave management and maintenance tracking.\n\n"
    "Built with the latest web technologies (React, TypeScript, Tailwind CSS, "
    "PostgreSQL), the system is deployed as a Progressive Web App (PWA) that "
    "works seamlessly on desktops, tablets, and smartphones."
)

pdf.sub_heading("Key Benefits")
benefits = [
    "Reduce manual paperwork by 90%",
    "Real-time student attendance & leave tracking",
    "QR-based parent verification for student safety",
    "Automated email & SMS notifications",
    "Comprehensive reports & analytics dashboard",
    "Mobile-responsive PWA - works on any device",
    "Multi-role access: Admin, Warden, Staff, Student",
    "Secure authentication with JWT",
]
for b in benefits:
    pdf.check_bullet(b)
pdf.spacer(3)

pdf.sub_heading("Technology Stack")
tech_items = [
    "Frontend: React 18, TypeScript, Vite, Tailwind CSS",
    "Backend: Node.js, Express, JWT Authentication",
    "Database: PostgreSQL (Supabase) with migrations",
    "Infrastructure: Docker-ready, CI/CD friendly",
]
for t in tech_items:
    pdf.bullet(t)


# ── PAGE 3 — Complete Feature List ──────────────────────────────────
pdf.add_page()
pdf.section_title("Complete Feature List (18+ Modules)")

features = [
    ("Dashboard & Analytics", "Real-time stats, occupancy charts, recent activities, announcement cards"),
    ("Student Management", "Full CRUD, profiles, parent info, photo uploads, course & batch tracking"),
    ("Room Management", "Room allocation, bed management, auto-assign, amenity tracking"),
    ("Leave Management", "QR-based parent call verification, multi-level approval, check-in/out tracking"),
    ("Attendance System", "Daily digital attendance, reporting, trend analysis, export"),
    ("Staff Management", "Staff profiles, shift timings, department & role tracking"),
    ("Staff Task Management", "Task assignment, progress tracking, photo submissions for proof"),
    ("Maintenance Requests", "Submit, track & approve requests, cost estimation"),
    ("Visitor Management", "Visitor logging, scheduling, ID verification, history"),
    ("Events Management", "Create events & announcements, calendar view, notifications"),
    ("Messages & Communication", "Internal messaging between all user roles"),
    ("Reports & Analytics", "Export PDF/CSV, charts, occupancy trends, student reports"),
    ("Settings & Configuration", "System settings, preferences, theme customization"),
    ("Credential Management", "Generate & manage login credentials for staff & students"),
    ("Parent Approval System", "Digital parent consent for leave with verification"),
    ("SMS & Email Notifications", "Automated alerts to students, parents & staff"),
    ("Profile Management", "Personal profile editing, avatar, password change"),
    ("QR Scanner System", "Camera & gallery-based QR code scanning for verification"),
]

for i, (title, desc) in enumerate(features, 1):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*PRIMARY)
    num = f"{i:2d}. "
    pdf.cell(10, 6, num)
    pdf.cell(55, 6, title)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK_GRAY)
    pdf.multi_cell(0, 6, f"- {desc}")
    pdf.ln(1)


# ── PAGE 4 — Pricing Tiers ──────────────────────────────────────────
pdf.add_page()
pdf.section_title("Pricing Tiers")

pdf.pricing_box(
    "Tier 1: Basic",
    "Rs.25,00,000  (Rs.25 Lakhs)",
    "Ideal for small hostels with up to 500 students",
    [
        "Software license (single campus)",
        "Deployment on college infrastructure",
        "1 year technical support",
        "Basic training (online, 2 sessions)",
        "Bug fixes for 1 year",
        "Up to 500 students capacity",
    ],
)

pdf.pricing_box(
    "Tier 2: Standard",
    "Rs.50,00,000  (Rs.50 Lakhs)",
    "Everything in Basic, plus customization & on-site support",
    [
        "Customization for college branding (logo, colors, name)",
        "On-site deployment & server setup",
        "2 years technical support & maintenance",
        "On-site training (3 days)",
        "SMS & Email integration setup",
        "Up to 2,000 students capacity",
        "Priority support",
    ],
    highlight=True,
)

pdf.pricing_box(
    "Tier 3: Premium",
    "Rs.75,00,000  (Rs.75 Lakhs)",
    "Everything in Standard, plus hosting, mobile app & 5-year AMC",
    [
        "Dedicated cloud/server hosting (3 years)",
        "Android mobile app (Capacitor)",
        "WhatsApp integration for parent notifications",
        "Custom feature development (up to 5 modules)",
        "5 years AMC (Annual Maintenance Contract)",
        "Unlimited students capacity",
        "24/7 dedicated support",
        "Quarterly system health-check visits",
    ],
)


# ── PAGE 5 — AMC ────────────────────────────────────────────────────
pdf.add_page()
pdf.section_title("Annual Maintenance Contract (AMC)")
pdf.body(
    "After the initial support period included in your chosen tier, "
    "colleges can subscribe to an Annual Maintenance Contract to ensure "
    "continuous updates, security patches, and expert support."
)
pdf.spacer(2)

# Table header
pdf.set_fill_color(*PRIMARY)
pdf.set_text_color(*WHITE)
pdf.set_font("Helvetica", "B", 10)
pdf.cell(45, 9, "  Plan", fill=True)
pdf.cell(40, 9, "  Annual Price", fill=True)
pdf.cell(0, 9, "  Includes", fill=True, ln=True)
pdf.set_text_color(*BLACK)
pdf.spacer(3)

pdf.amc_row(
    "Basic AMC",
    "Rs.3,00,000/year",
    "Bug fixes, security updates, email support"
)
pdf.amc_row(
    "Standard AMC",
    "Rs.5,00,000/year",
    "Basic + feature updates, phone support, quarterly visits"
)
pdf.amc_row(
    "Premium AMC",
    "Rs.8,00,000/year",
    "Standard + dedicated account manager, custom features, 24/7 support"
)

pdf.spacer(6)
pdf.sub_heading("Why AMC Matters")
amc_reasons = [
    "Continuous security patches protect student data",
    "Regular feature updates keep the system modern",
    "Dedicated support minimizes downtime",
    "Proactive health checks prevent issues before they occur",
]
for r in amc_reasons:
    pdf.check_bullet(r)


# ── PAGE 6 — What We Need From The College ──────────────────────────
pdf.add_page()
pdf.section_title("What We Need From The College")

# 1 — Server
pdf.sub_heading("1.  Server Infrastructure (if self-hosted)")
reqs_server = [
    "Minimum: 4 CPU cores, 8 GB RAM, 100 GB SSD",
    "Linux server (Ubuntu 22.04 LTS recommended)",
    "Domain name pointing to server",
    "SSL certificate (we can set up Let's Encrypt)",
]
for r in reqs_server:
    pdf.bullet(r)
pdf.spacer(3)

# 2 — Cloud
pdf.sub_heading("2.  OR Cloud Hosting (we manage)")
pdf.bullet("College provides domain name")
pdf.bullet("We handle all infrastructure, backups & scaling")
pdf.spacer(3)

# 3 — Data
pdf.sub_heading("3.  Data & Configuration")
data_items = [
    "College logo & branding assets (SVG or high-res PNG)",
    "Student database (Excel / CSV format)",
    "Room & building information",
    "Staff details & roles",
    "Admin contact details",
]
for d in data_items:
    pdf.bullet(d)
pdf.spacer(3)

# 4 — Network
pdf.sub_heading("4.  Network Requirements")
pdf.bullet("Stable internet connection (minimum 10 Mbps)")
pdf.bullet("WiFi coverage in hostel premises (for mobile access)")
pdf.spacer(3)

# 5 — Admin
pdf.sub_heading("5.  Administrative")
admin_items = [
    "Single point of contact from the college",
    "Authorized signatory for agreement",
    "Timeline for deployment (typical: 4-6 weeks)",
]
for a in admin_items:
    pdf.bullet(a)
pdf.spacer(3)

# 6 — SMS/Email
pdf.sub_heading("6.  For SMS & Email Notifications")
pdf.bullet("College email domain (for sending notifications)")
pdf.bullet("SMS gateway subscription (we'll help set up)")


# ── PAGE 7 — Implementation Timeline ────────────────────────────────
pdf.add_page()
pdf.section_title("Implementation Timeline")

pdf.body(
    "A typical deployment follows a 6-week plan, ensuring thorough "
    "requirements capture, smooth data migration, robust testing, "
    "and comprehensive training for every user role."
)
pdf.spacer(4)

timeline = [
    ("Week 1-2", "Requirements Gathering & Customization",
     "Understand college-specific workflows, branding, and module priorities. "
     "Configure the system and apply customizations."),
    ("Week 3", "Deployment & Data Migration",
     "Set up servers / cloud, deploy application, import student & room data."),
    ("Week 4", "Testing & UAT",
     "User Acceptance Testing with college stakeholders. Bug fixes & adjustments."),
    ("Week 5", "Training Sessions",
     "Dedicated training for Admin, Warden, Staff, and Student user roles."),
    ("Week 6", "Go-Live & Support Handover",
     "Production launch, monitoring, and handover to maintenance team."),
]

for week, title, desc in timeline:
    # Week badge
    pdf.set_fill_color(*ACCENT)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(30, 8, f"  {week}", fill=True)

    # Title
    pdf.set_text_color(*PRIMARY)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"  {title}", ln=True)

    # Description
    pdf.set_x(45)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK_GRAY)
    pdf.multi_cell(140, 5.5, desc)
    pdf.ln(4)

pdf.spacer(8)
pdf.hr()
pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(*GRAY)
pdf.cell(0, 8, "* Timelines may vary based on customization requirements and data readiness.", ln=True, align="C")


# ── PAGE 8 — Contact ────────────────────────────────────────────────
pdf.add_page()
pdf.ln(30)

pdf.set_fill_color(*PRIMARY)
pdf.rect(15, 50, 180, 3, "F")
pdf.ln(15)

pdf.set_font("Helvetica", "B", 28)
pdf.set_text_color(*PRIMARY)
pdf.cell(0, 14, "Get in Touch", ln=True, align="C")
pdf.ln(8)

pdf.set_font("Helvetica", "", 12)
pdf.set_text_color(*DARK_GRAY)
pdf.cell(0, 8, "We'd love to discuss how TC Hostel Connect", ln=True, align="C")
pdf.cell(0, 8, "can transform your hostel management.", ln=True, align="C")
pdf.ln(16)

# Contact card
card_x = 40
card_w = 130
card_y = pdf.get_y()
card_h = 60

pdf.set_fill_color(*LIGHT_BG)
pdf.set_draw_color(*ACCENT)
pdf.set_line_width(0.4)
pdf.rect(card_x, card_y, card_w, card_h, "DF")

pdf.set_xy(card_x + 10, card_y + 8)
pdf.set_font("Helvetica", "B", 11)
pdf.set_text_color(*PRIMARY)
pdf.cell(card_w - 20, 8, "Contact Person:", ln=True)
pdf.set_x(card_x + 10)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(*DARK_GRAY)
pdf.cell(card_w - 20, 7, "[Your Name]", ln=True)

pdf.set_x(card_x + 10)
pdf.cell(card_w - 20, 7, "Phone:   [Your Phone Number]", ln=True)
pdf.set_x(card_x + 10)
pdf.cell(card_w - 20, 7, "Email:    [Your Email Address]", ln=True)
pdf.set_x(card_x + 10)
pdf.cell(card_w - 20, 7, "Company: [Your Company Name]", ln=True)

pdf.set_y(card_y + card_h + 20)
pdf.hr()
pdf.set_font("Helvetica", "I", 10)
pdf.set_text_color(*GRAY)
pdf.cell(0, 8, "Thank you for considering TC Hostel Connect.", ln=True, align="C")
pdf.cell(0, 8, "This document is confidential and intended for the named recipient only.", ln=True, align="C")

# Bottom accent bar
pdf.set_fill_color(*ACCENT)
pdf.rect(15, 275, 180, 3, "F")


# ═════════════════════════════════════════════════════════════════════
# Save
# ═════════════════════════════════════════════════════════════════════
output_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "TC_Hostel_Connect_Pricing.pdf",
)
pdf.output(output_path)
print(f"PDF generated successfully: {output_path}")
