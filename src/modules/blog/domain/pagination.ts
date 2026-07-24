export const PAGE_SIZE = 10

export function toSafePage(page: number): number {
  const parsed = Math.floor(page)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export function toOffset(page: number, pageSize: number = PAGE_SIZE): number {
  return (toSafePage(page) - 1) * pageSize
}

export function toTotalPages(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}
