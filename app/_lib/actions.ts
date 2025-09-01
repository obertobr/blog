'use server'
import { createPost } from "./posts"
import { slugify } from "./util"

export async function createPostAction(initialState: any, formData: FormData) {
    const title = formData.get("title") as string
    const slug = slugify(title)
    const content = formData.get("content") as string

    try{
        const post = await createPost(title, content, slug)
        return { ...initialState, post }
    } catch(err: any){
        const message = err.message

        return { ...initialState, message }
    }

}