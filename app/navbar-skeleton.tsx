export function NavbarSkeleton() {
  return (
    <nav className="px-4 py-3 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg text-white">Workout</span>
        <span className="text-sm text-white/20">Entrenamiento</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse" />
      </div>
    </nav>
  )
}
