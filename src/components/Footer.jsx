const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/80 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center text-sm text-zinc-400 md:flex-row md:justify-between md:text-left">
        <div>
          <p className="text-lg font-semibold text-white">BacTracker</p>
          <p className="mt-2 text-xs text-zinc-500">
            Built for consistent Bac preparation.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]">
          <span>Features</span>
          <span>Pricing</span>
          <span>Contact</span>
        </div>
        <p className="text-xs text-zinc-500">© 2026 BacTracker</p>
      </div>
    </footer>
  )
}

export default Footer

