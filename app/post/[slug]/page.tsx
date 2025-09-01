import { getPostBySlug } from "@/app/_lib/posts"

export default async function post({
    params,
}: {
    params: Promise<{ slug:string}>
}) {
    const { slug } = await params
    const post = await getPostBySlug(slug)

    return (
        <div className="m-5">
            <h1>{post?.title}</h1>
            <p>{post?.content}</p>
        </div>
    )
}