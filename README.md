# AI-Powered Resume Reviewer

A full-stack web application where users can upload their resume (PDF or DOCX), get it parsed, and receive a detailed AI-generated analysis within seconds powered by the Gemini API.

## Features

- **Document Parsing**: Upload PDF or DOCX files and seamlessly extract plain text.
- **AI Engine**: Gemini 2.5 Flash API evaluates the resume based on industry standards or a specific Job Description.
- **Results Dashboard**: View ATS compatibility, content strength, formatting, and grammar scores.
- **Actionable Insights**: See a categorized breakdown of missing keywords, strengths, and weaknesses.
- **Bullet Rewriter**: Get AI-generated rewritten bullet points for weak sections of the resume, presented in a clear before-and-after view.
- **Authentication**: JWT authentication flow fully isolated on the frontend using Clerk.

## Tech Stack

### Frontend (Client)
- React
- Vite
- Tailwind CSS (v3)
- Shadcn UI Components
- Clerk (Authentication)
- Sonner (Toasts)
- React Dropzone
- React Router DOM

### Backend (Server)
- Node.js
- Express
- MongoDB (Mongoose)
- Gemini API (`@google/generative-ai`)
- `pdf-parse` & `mammoth` (File Parsing)
- Multer (File Upload Handling)

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)
- Clerk Publishable Key
- Google Gemini API Key

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository_url>
   cd resume-reviewer
   \`\`\`

2. Install dependencies for both client and server:
   \`\`\`bash
   cd client
   npm install
   cd ../server
   npm install
   \`\`\`

3. Set up environment variables:

   **Client (`client/.env`)**:
   \`\`\`env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   \`\`\`

   **Server (`server/.env`)**:
   \`\`\`env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/resume-reviewer
   GEMINI_API_KEY=your_gemini_api_key
   \`\`\`

4. Start the development servers:

   Terminal 1 (Backend):
   \`\`\`bash
   cd server
   npm run dev
   \`\`\`

   Terminal 2 (Frontend):
   \`\`\`bash
   cd client
   npm run dev
   \`\`\`

5. Open your browser and navigate to `http://localhost:5173`.
