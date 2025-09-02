'use client'
import { redirect } from "next/navigation"
import toast from "react-hot-toast"
import { useActionState } from "react"
import { createPostAction } from "../_lib/actions"
import React from "react"

const initialState = { message: '', slug: null }

export default function newPostPage() {
    const [state, formAction, pending] = useActionState(createPostAction, initialState)

    React.useEffect(() => {
        if (!state) return

        if (state.slug) {
            toast.success("Post Created")
            redirect(`post/${state.slug}`)
        } else if (state.message) {
            toast.error(state.message)
        }
    }, [state])

    return (
        <form action={formAction} className="flex flex-col m-5">
            <input type="text" name="title" placeholder="Title" className="border-white border-2" minLength={5} required defaultValue={(state.formData?.get("title") || "") as string}></input>
            <textarea name="content" placeholder="content" minLength={20} required defaultValue={(state.formData?.get("content") || "") as string}></textarea>
            <button type="submit">Save</button>
        </form>
    )
}