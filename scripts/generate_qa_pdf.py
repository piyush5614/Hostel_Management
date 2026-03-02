from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'TC Hostel Connect', 0, 1, 'C')
        self.set_font('Arial', 'B', 12)
        self.cell(0, 8, 'Project Questions & Answers', 0, 1, 'C')
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()

qa = [
    ('Q1. What is the purpose of this project?',
     'TC Hostel Connect is a comprehensive hostel management system that digitizes all hostel operations - student enrollment, room allocation, attendance, leave requests, maintenance, visitor tracking, staff task management, and reporting - replacing manual paper-based processes.'),
    ('Q2. Which languages and frameworks are used?',
     'TypeScript is the primary language. The frontend uses React 18 with Vite, and the backend uses Express.js. Styling is done with Tailwind CSS. The database layer uses PostgreSQL (Supabase) for production and SQLite for local development. SQL is used for migrations.'),
    ('Q3. Why did you choose React for the frontend?',
     'React provides a component-based architecture that allows reusable UI elements, efficient rendering via virtual DOM, and a large ecosystem. Combined with TypeScript, it ensures type safety and better maintainability.'),
    ('Q4. What is Zustand and why use it instead of Redux?',
     'Zustand is a lightweight state management library. It was chosen over Redux because it requires minimal boilerplate, has a simpler API, supports persist middleware for saving auth state to localStorage, and is sufficient for this application complexity.'),
    ('Q5. How does authentication work in this project?',
     'Users log in with email/password or auto-generated credentials (e.g., STAFF-0001). The backend hashes passwords using bcryptjs and issues JWT tokens. The frontend stores the auth state via Zustand persist middleware in localStorage. Protected routes check authentication before rendering.'),
    ('Q6. What is Supabase and why is it used?',
     'Supabase is an open-source Firebase alternative built on PostgreSQL. It provides authentication, a real-time database, Row-Level Security (RLS) policies, and edge functions. It was chosen for its SQL-based approach, built-in auth, and easy migration management.'),
    ('Q7. What is Row-Level Security (RLS)?',
     'RLS is a PostgreSQL feature that restricts which rows a user can access based on policies. For example, students can only view their own data, while admins can access everything. This enforces security at the database level.'),
    ('Q8. How does the leave management parent approval workflow work?',
     'When a student submits a leave request, a unique approval code is generated. A link with this code is sent to the parent via SMS. The parent clicks the link which opens a public page at /approve/:approvalCode where they can approve or reject the leave without needing an account.'),
    ('Q9. What is Vite and how is it different from Webpack?',
     'Vite is a modern build tool that uses native ES modules for development (instant server start) and Rollup for production builds. It is significantly faster than Webpack because it does not bundle during development - it serves files on demand.'),
    ('Q10. How is the project structured?',
     'The project follows a clean separation - frontend/ contains all React UI code (components, pages, services, store), backend/ contains the Express server (routes, middleware, DB), and database/ contains Supabase migrations and edge functions. Config files remain at root as required by build tools.'),
    ('Q11. What is Zod and why is it used with React Hook Form?',
     'Zod is a TypeScript-first schema validation library. It defines validation rules (required fields, email format, min length, etc.) as schemas. React Hook Form integrates with Zod via @hookform/resolvers to validate form inputs before submission, providing type-safe form handling.'),
    ('Q12. What are the different user roles and their permissions?',
     'Four roles - Admin (full system access, credential management, reports), Warden (student management, leave approvals, room allocation, task oversight), Staff (assigned tasks, attendance marking, maintenance), Student (profile view, leave requests, complaints, events).'),
    ('Q13. How does the attendance system work?',
     'Attendance is tracked twice daily (morning/evening). The system supports bulk upsert operations - wardens/staff can mark attendance for all students at once. Records are stored per-date with present/absent/late status.'),
    ('Q14. What export formats are supported?',
     'The system supports PDF, Excel, and CSV exports with configurable date ranges and filters for reports, attendance records, and student data.'),
    ('Q15. What is a PWA and how does this project support it?',
     'A Progressive Web App (PWA) works like a native app on mobile/desktop. This project includes a manifest.json that enables Add to Home Screen functionality, providing an app-like experience in the browser.'),
]

for i, (q, a) in enumerate(qa):
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(0, 51, 153)
    pdf.multi_cell(0, 7, q)
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 6, f'A: {a}')
    pdf.ln(4)

out = os.path.join(r'c:\Users\asus4\Desktop\Hostel_Comp', 'Project_QA.pdf')
pdf.output(out)
print(f'PDF saved to: {out}')
