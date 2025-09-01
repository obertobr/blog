import { redirect } from "next/navigation"
import { createPost } from "../_lib/posts"
import { slugify } from "../_lib/util"

export default function newPostPage() {
    async function savePost(formData: FormData) {
        "use server"

        const title = formData.get("title") as string
        const slug = slugify(title)
        const content = formData.get("content") as string

        const post = await createPost(title,content, slug)

        redirect(`/post/${post.slug}`)
    }

    return (
        <form action={savePost} className="flex flex-col m-5">
            <input type="text" name="title" placeholder="Title" className="border-white border-2" minLength={5} required></input>
            <textarea name="content" placeholder="content" minLength={20} required></textarea>
            <button type="submit">Save</button>
        </form>
    )
}