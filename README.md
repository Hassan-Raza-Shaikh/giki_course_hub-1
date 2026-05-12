# GIKI Course Hub 🚀

A modern, high-performance academic resource platform built for students. GIKI Course Hub provides a centralized repository for course materials, including notes, slides, past papers, and lab manuals, all wrapped in a premium, responsive interface.

---

## ✨ Key Features

- **🎯 Organized Directory**: Browse materials by Faculty → Program → Semester → Course.
- **⚡ Electric Ember Theme**: A stunning, premium dark mode design with neon accents and vibrant micro-animations.
- **🔍 Global Search**: Instant, categorized search across the entire academic directory.
- **📤 Smart Contributions**: Secure file upload system with admin review workflow.
- **🔖 Bookmarking**: Save your most-used resources to your personal dashboard.
- **📧 Notifications**: Automated email updates for material approvals and rejections.
- **🛡️ Admin Command Center**: Comprehensive tools for content moderation, user management, and platform analytics.

---

## 🛠 Tech Stack

### Frontend
- **React (Vite)**: For a fast, modern single-page application experience.
- **Vanilla CSS**: Custom-built "Electric Ember" design system for maximum performance and visual control.
- **Firebase Auth**: Secure Google Sign-In integration.
- **Lucide React**: Crisp, modern iconography.

### Backend
- **Flask (Python)**: Robust RESTful API handling business logic and security.
- **PostgreSQL**: Relational database for complex academic hierarchies and data integrity.
- **Cloudflare R2**: High-performance, S3-compatible object storage for academic documents.
- **SMTP**: Integrated email notification system for user feedback loops.

---

## 🏗 Repository Structure

```
├── frontend/           # React + Vite frontend source code
├── routes/             # Flask API endpoints (Admin, Auth, Files, etc.)
├── sql/                # Database schema and PL/pgSQL functions
├── static/             # Static assets and build output
├── app.py              # Backend entry point and configuration
├── email_service.py    # Asynchronous email notification logic
├── db.py               # Database connection and pooling
└── requirements.txt    # Python dependencies
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- PostgreSQL Instance
- Cloudflare R2 / S3 Credentials

### Local Development

1. **Clone the repository**
2. **Setup Backend**:
   ```bash
   pip install -r requirements.txt
   # Configure your .env file with DB and R2 credentials
   python app.py
   ```
3. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## ☁️ Deployment

The project is architected for modern cloud platforms:
- **Frontend**: Optimized for Vercel / Netlify.
- **Backend**: Containerized and ready for Render / Heroku / AWS.
- **Database**: Compatible with any managed PostgreSQL service (Supabase, Neon, etc.).

---

## 📜 License

This project is developed for educational purposes at GIK Institute.
