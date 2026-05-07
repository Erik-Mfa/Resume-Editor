import { ResumeUploader } from '@/components/ResumeUploader'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#a5b4fc 1px, transparent 1px), linear-gradient(to right, #a5b4fc 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Google Vertex AI
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Resume{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Pivot AI
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Upload your resume, paste a job description. AI tailors your summary and bullet points
            to match the role — without inventing new jobs or credentials.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
        <ResumeUploader />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-5 text-center text-xs text-slate-600">
        Resume Pivot AI &mdash; your data is never stored
      </footer>
    </div>
  )
}
