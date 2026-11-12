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
            <div className="m-5 bg-white border border-gray-300 rounded-lg">
                <header className="border-b border-gray-300 p-6 pt-4 pb-6">
                    <h1 className="text-3xl sm:text-5xl mb-3 font-bold">{post.title || "Rascunho sem título"}</h1>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <RelativeDate date={post.createdAt} prefix="Publicado" className="text-gray-600" />
                            {!post.published && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    Rascunho
                                </span>
                            )}
                            {isAuth && (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/createPost?id=${post.id}`}
                                        className="text-xs text-sky-600 hover:text-sky-800 hover:font-bold cursor-pointer transition-all"
                                    >
                                        Editar {post.published ? "Post" : "Rascunho"}
                                    </Link>
                                    <span className="text-gray-300">•</span>
                                    <DeletePostButton postId={post.id} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {post.tags?.map(tag => (
                                <span
                                    className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: tag.color || '#d1d5dc' }}
                                    key={tag.id}
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </header>
                <article className="prose max-w-none p-6 pt-5 prose-hr:mt-3 prose-hr:mb-3">
                    <div dangerouslySetInnerHTML={{ __html: contentRemark }} />
                </article>
            </div>
        </div>
    )
}