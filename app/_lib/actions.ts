'use server'
import { createPost } from "./posts"
import { slugify } from "./util"

export type formPost = {
    title: string;
    content: string;
    tags: string[];
    description?: string;
    slug?: string;
}

export async function createPostAction(initialState: any, formPost: formPost) {
    const title = formPost.title
    const slug = slugify(title)
    const content = formPost.content
    const tags = formPost.tags

    try{
        const post = await createPost(title, content, slug, tags)
        const message = "Post created"
        return { ...initialState, message, slug: post.slug }
    } catch(err: any){
        const message = err.message

        return { ...initialState, message, formPost }
    }
}