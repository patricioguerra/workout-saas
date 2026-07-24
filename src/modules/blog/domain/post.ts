export type PostContent = {
  title: string
  excerpt: string
  body: string
}

export type BlogPost = {
  id: string
  slug: string
  content: { es: PostContent; en: PostContent }
  coverImageUrl: string | null
  sourceUrl: string | null
  publishedAt: string
}
