import { getPublishedPosts } from '../infra/post-repository'
import { toSafePage, toTotalPages } from '../domain/pagination'
import type { BlogPost } from '../domain/post'

export async function listPosts(
  page: number
): Promise<{ posts: BlogPost[]; totalPages: number; page: number }> {
  const safePage = toSafePage(page)
  const { posts, total } = await getPublishedPosts(safePage)
  return { posts, totalPages: toTotalPages(total), page: safePage }
}
