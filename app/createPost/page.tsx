'use client'
import { redirect } from "next/navigation"
import { createPost } from "../_lib/posts"
import { slugify } from "../_lib/util"
import toast from "react-hot-toast"
import { useActionState } from "react"
import { createPostAction } from "../_lib/actions"
import React from "react"

const initialState = { message: '', post: null }

export default function newPostPage() {
    const [state, formAction, pending] = useActionState(createPostAction, initialState)

    React.useEffect(() => {
        if (!state) return

        if (state.post) {
            toast.success("Post Created")
            setTimeout(redirect(`post/${state.post.slug}`), 500)
        } else if (state.message) {
            toast.error(state.message)
        }
    }, [state])

    return (
        <form action={formAction} className="flex flex-col m-5">
            <input type="text" name="title" placeholder="Title" className="border-white border-2" minLength={5} required></input>
            <textarea name="content" placeholder="content" minLength={20} required></textarea>
            <button type="submit">Save</button>
        </form>
    )
}