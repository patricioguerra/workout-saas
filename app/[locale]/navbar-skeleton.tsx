export function NavbarSkeleton() {
  return (
    <nav className="sticky top-0 z-40 bg-black/85 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-white">ATHLEX</span>
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
      </div>
    </nav>
  )
}
