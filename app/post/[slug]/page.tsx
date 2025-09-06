import { getPostBySlug } from "@/app/_lib/posts"
import { markdownToHtml } from "@/app/_lib/util"

export default async function post({
    params,
}: {
    params: Promise<{ slug:string}>
}) {
    const { slug } = await params
    const post = await getPostBySlug(slug)
    const contentRemark = await markdownToHtml(post?.content || "")

    return (
        <div className="max-w-4xl mx-auto">
            <div className="m-5 bg-white border border-gray-300 rounded-lg">
            <header className="border-b border-gray-300 p-6 pt-4 pb-6">
                <h1 className="text-3xl sm:text-5xl mb-3 font-bold">{post?.title}</h1>
                <span className="text-gray-600">Publicado em {post?.createdAt.toDateString()}</span>
            </header>
            <article className="prose max-w-none p-6 pt-5 prose-hr:mt-3 prose-hr:mb-3">
                <div dangerouslySetInnerHTML={{ __html: contentRemark }}/>
            </article>
        </div>
        </div>
    )
}