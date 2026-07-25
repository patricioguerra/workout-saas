export function BrandMarkCompact({ className }: { className?: string }) {
  return (
    <span className={`flex flex-col items-center gap-0.5 ${className ?? ""}`}>
      <img src="/brand-mark-a.png" alt="ATHLEX" className="h-5 w-auto" />
      <span
        className="text-[8px] font-medium uppercase tracking-[0.25em] text-white opacity-75"
        style={{ fontFamily: "var(--font-league-spartan), system-ui, sans-serif" }}
      >
        training
      </span>
    </span>
  )
}
