# Project: Resume-Pivot-AI
A Next.js application to adapt resumes (Harvard IT Standard) to job descriptions using Google Vertex AI.

## Technical Stack
- **Framework:** Next.js (App Router, TypeScript)
- **AI:** Google Vertex AI + Generative AI SDK 
- **File Handling:** `pdf-parse`, `mammoth` (Import)
- **Export:** `@react-pdf/renderer` (Harvard IT Layout)
- **Infrastructure:** Google Cloud Run + GitHub Actions

## Project Rules & Standards
- **Coding Style:** Functional components, Tailwind CSS, TypeScript interfaces for all data models.
- **AI Logic (The 60/40 Rule):**
    - **Keep (40%):** Names, Contact Info, Education, Company Names, Dates.
    - **Adapt (60%):** Professional Summary and Experience Bullet Points.
    - **Strict Constraint:** Never hallucinate new jobs, companies, or degrees. Only "pivot" the wording of existing achievements.
- **Naming Conventions:** - Components: PascalCase (e.g., `ResumeUploader.tsx`)
    - API Routes: camelCase (e.g., `api/transform-resume/route.ts`)
- **Error Handling:** Always wrap PDF parsing and AI calls in try-catch blocks with user-friendly error messages.

## Deployment & CI/CD
- **Cloud:** Google Cloud Platform (GCP).
- **Authentication:** Use Application Default Credentials (ADC) for local dev and Service Account for Cloud Run.
- **Pipeline:** GitHub Actions triggers on `push` to `main`.

## Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks
- `docker build -t resume-pivot .` - Local container test

## JSON Schema (Internal State)
```json
{
  "personalInfo": { "name": "", "email": "", "phone": "", "linkedin": "" },
  "summary": "",
  "experience": [
    { "company": "", "role": "", "dates": "", "bullets": [] }
  ],
  "education": [],
  "skills": []
}