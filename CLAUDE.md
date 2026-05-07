# Project: Resume-Pivot-AI
A Next.js application that adapts resumes to job descriptions using Google Vertex AI, preserving the original document formatting.

## Technical Stack
- **Framework:** Next.js (App Router, TypeScript)
- **AI:** Google Vertex AI + Generative AI SDK (`@google/genai`)
- **File Handling:** `pdf-parse` (PDF text extraction), `mammoth` (DOCX text extraction)
- **Document Editing:** `jszip` (in-place DOCX XML editing), `docx` (generate DOCX from PDF input)
- **Infrastructure:** Google Cloud Run + GitHub Actions

## Architecture
```
Upload PDF/DOCX → Extract raw text → AI returns old/new replacement pairs → Apply to original document → Return modified document
```
- **DOCX input:** Text is replaced directly in the document's XML (preserves all original formatting)
- **PDF input:** A new clean DOCX is generated with the adapted text (in-place PDF editing is not feasible)

## Project Rules & Standards
- **Coding Style:** Functional components, Tailwind CSS, TypeScript interfaces for all data models.
- **AI Logic:**
    - **Keep:** Names, Contact Info, Education, Company Names, Job Titles, Dates, Skills.
    - **Adapt:** Professional Summary and Experience Bullet Points only.
    - **Strict Constraint:** Never hallucinate new jobs, companies, or degrees. Only reword existing achievements.
    - AI returns `TextReplacement[]` — each `old` value must be a verbatim substring from the original text.
- **Naming Conventions:**
    - Components: PascalCase (e.g., `ResumeUploader.tsx`)
    - API Routes: camelCase (e.g., `api/transform-resume/route.ts`)
- **Error Handling:** Always wrap file parsing and AI calls in try-catch blocks with user-friendly error messages.

## Key Files
- `src/lib/extractText.ts` — Extract raw text from PDF/DOCX
- `src/lib/genAi.ts` — Gemini AI call, returns replacement pairs
- `src/lib/applyReplacements.ts` — Apply replacements to DOCX XML or generate new DOCX
- `src/app/api/transform-resume/route.ts` — Single API endpoint (returns binary DOCX)
- `src/components/ResumeUploader.tsx` — Upload UI component

## Deployment & CI/CD
- **Cloud:** Google Cloud Platform (GCP).
- **Authentication:** Use Application Default Credentials (ADC) for local dev and Service Account for Cloud Run.
- **Pipeline:** GitHub Actions triggers on `push` to `main`.

## Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks
- `docker build -t resume-pivot .` - Local container test