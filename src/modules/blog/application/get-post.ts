import { getPostBySlug } from '../infra/post-repository'
import type { BlogPost } from '../domain/post'

export async function getPost(slug: string): Promise<BlogPost | null> {
  return getPostBySlug(slug)
}
