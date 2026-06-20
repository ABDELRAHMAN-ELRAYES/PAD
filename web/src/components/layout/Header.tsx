"use client"

export default function Header() {
  return (
    <header className="pad-header h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">PAD</h1>
        <p className="text-xs sm:text-xs text-muted-foreground hidden sm:block">
          AI-generated system design & documentation
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <nav className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#help" className="hover:text-foreground transition-colors">
            Help
          </a>
          <a href="#feedback" className="hover:text-foreground transition-colors">
            Feedback
          </a>
        </nav>
      </div>
    </header>
  )
}
