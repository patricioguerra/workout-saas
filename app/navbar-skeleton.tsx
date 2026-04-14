export function NavbarSkeleton() {
  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg">Workout</span>
        <span className="text-sm text-gray-300">Entrenamiento</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
      </div>
    </nav>
  )
}
