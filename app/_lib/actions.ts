'use server'
import path from "path";
import { createPost, createTag, deleteTag, updateTag } from "./posts"
import { slugify } from "./util"
import { unlink, writeFile } from "fs/promises"
import { Tag } from "../generated/prisma";

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

    try {
        const post = await createPost(title, content, slug, tags)
        const message = "Post created"
        return { ...initialState, message, slug: post.slug }
    } catch (err: any) {
        const message = err.message

        return { ...initialState, message, formPost }
    }
}


export async function saveAssetAction(_: any, fileList: FileList) {
    const uploadDir = path.join(process.cwd(), "public", "assets")

    let assetsLoaded: string[] = []
    let errors: string[] = []

    for (const file of fileList) {
        try {
            const filePath = path.join(uploadDir, file.name)

            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            await writeFile(filePath, buffer)

            assetsLoaded.push(`/assets/${file.name}`)
        } catch (err: any) {
            errors.push(`Image: ${file.name} Error: ${err.message}`)
        }
    }

    return {
        assets: assetsLoaded,
        errors: errors
    }
}

export async function deleteAssetAction(_: any, filePath: string) {
    try {
        const fullPath = path.join(process.cwd(), "public", filePath.replace(/^\/+/, ""))

        await unlink(fullPath)

        return {
            success: true,
            message: `File ${filePath} deleted`,
            filePath: filePath
        }
    } catch (err) {
        return { error: "Error deleting file" }
    }
}

export async function saveTagAction(_: any, tag: { id?: number; name: string; color?: string | null }) {
    try {
        let savedTag
        if (tag.id) {
            savedTag = await updateTag(tag.id, { name: tag.name, color: tag.color })
        } else {
            savedTag = await createTag(tag.name, tag.color)
        }
        return {
            success: true,
            message: `Tag ${savedTag.name} saved`,
            tag: savedTag
        }
    } catch (err: any) {
        if (err.code === "P2002") {
            return { error: "Tag with this name already exists" }
        }
        return { error: "Error saving tag" }
    }
}

export async function deleteTagAction(_: any, tag: { id: number; name?: string }) {
    try {
        await deleteTag(tag.id)
        return {
            success: true,
            message: `Tag ${tag.name || ''} deleted`,
            tagId: tag.id
        }
    } catch (err) {
        return { error: "Error deleting tag" }
    }
}