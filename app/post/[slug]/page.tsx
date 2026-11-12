import { getPostBySlug } from "@/app/_lib/posts"
import { markdownToHtml } from "@/app/_lib/util"
import { notFound } from "next/navigation"
import { isAuthenticated } from "@/app/_lib/auth"
import DeletePostButton from "@/components/DeletePostButton"
import RelativeDate from "@/components/RelativeDate"
import Link from "next/link"

export default async function Post({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    if (!post) {
        notFound()
    }

    const isAuth = await isAuthenticated()

    if (!post.published && !isAuth) {
        notFound()
    }

    const contentRemark = await markdownToHtml(post.content || "")

    return (
        <div className="max-w-4xl mx-auto">
            <div className="m-5 bg-white dark:bg-gh-surface border border-gray-300 dark:border-gh-border rounded-lg shadow-xs">
                <header className="border-b border-gray-300 dark:border-gh-border p-6 pt-4 pb-6">
                    <h1 className="text-3xl sm:text-5xl mb-3 font-bold text-gray-900 dark:text-gh-text">{post.title || "Rascunho sem título"}</h1>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <RelativeDate date={post.createdAt} prefix="Publicado" className="text-gray-600 dark:text-gh-muted" />
                            {!post.published && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    Rascunho
                                </span>
                            )}
                            {isAuth && (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/createPost?id=${post.id}`}
                                        className="text-xs text-sky-600 hover:text-sky-800 dark:text-gh-blue dark:hover:text-gh-blue-hover hover:font-bold cursor-pointer transition-all"
                                    >
                                        Editar {post.published ? "Post" : "Rascunho"}
                                    </Link>
                                    <span className="text-gray-300 dark:text-gh-border">•</span>
                                    <DeletePostButton postId={post.id} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {post.tags?.map(tag => (
                                <span
                                    className="text-xs font-medium px-2.5 py-0.5 rounded-full text-gray-900"
                                    style={{ backgroundColor: tag.color || '#d1d5dc' }}
                                    key={tag.id}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </header>
                <article className="prose dark:prose-invert max-w-none p-6 pt-5 prose-hr:mt-3 prose-hr:mb-3">
                    <div dangerouslySetInnerHTML={{ __html: contentRemark }} />
                </article>
            </div>
        </div>
    )
}