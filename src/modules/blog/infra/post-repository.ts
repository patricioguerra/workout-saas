import { createSupabaseServerClient } from '@/shared/infra/supabase/server'
import { toOffset, PAGE_SIZE } from '../domain/pagination'
import type { BlogPost, PostContent } from '../domain/post'

type BlogPostRow = {
  id: string
  slug: string
  content: { es: PostContent; en: PostContent }
  cover_image_url: string | null
  source_url: string | null
  published_at: string
}

const SELECT_COLUMNS = 'id, slug, content, cover_image_url, source_url, published_at'

function toBlogPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    content: row.content,
    coverImageUrl: row.cover_image_url,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
  }
}

export async function getPublishedPosts(page: number): Promise<{ posts: BlogPost[]; total: number }> {
  const supabase = await createSupabaseServerClient()
  const offset = toOffset(page)
  const { data, count } = await supabase
    .from('blog_posts')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  return {
    posts: ((data as BlogPostRow[] | null) ?? []).map(toBlogPost),
    total: count ?? 0,
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('blog_posts')
    .select(SELECT_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return null
  return toBlogPost(data as BlogPostRow)
}
