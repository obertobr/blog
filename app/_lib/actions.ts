'use server'
import path from "path";
import { createPost, createTag, deleteTag, updateTag } from "./posts"
import { slugify } from "./util"
import { mkdir, unlink, writeFile } from "fs/promises"
import { clearAdminSession, isAuthenticated, isValidPassword, setAdminSession } from "./auth"

export type formPost = {
    title: string;
    content: string;
    tags: string[];
    description?: string;
    slug?: string;
}

export type FormPostState = {
    message: string;
    slug?: string | null;
    formPost?: formPost;
}

export async function loginAction(_: unknown, password: string) {
    if (!isValidPassword(password)) {
        return { error: "Senha incorreta" }
    }
    await setAdminSession()
    return { success: true }
}

export async function logoutAction() {
    await clearAdminSession()
    return { success: true }
}

export async function getAuthStatusAction() {
    const authenticated = await isAuthenticated()
    return { authenticated }
}

export async function createPostAction(initialState: FormPostState, formPost: formPost): Promise<FormPostState> {
    if (!await isAuthenticated()) {
        return { ...initialState, message: "Não autorizado", formPost }
    }

    const title = formPost.title
    const slug = slugify(title)
    const content = formPost.content
    const tags = formPost.tags

    try {
        const post = await createPost(title, content, slug, tags)
        const message = "Post created"
        return { ...initialState, message, slug: post.slug }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Error creating post"

        return { ...initialState, message, formPost }
    }
}


export async function saveAssetAction(_: unknown, fileList: FileList) {
    if (!await isAuthenticated()) {
        return { assets: [], errors: ["Não autorizado"] }
    }

    const uploadDir = path.join(process.cwd(), "public", "assets")
    await mkdir(uploadDir, { recursive: true })

    const assetsLoaded: string[] = []
    const errors: string[] = []

    for (const file of fileList) {
        try {
            const fileName = path.basename(file.name)
            const filePath = path.join(uploadDir, fileName)

            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            await writeFile(filePath, buffer)

            assetsLoaded.push(`/assets/${fileName}`)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error"
            errors.push(`Image: ${file.name} Error: ${errorMessage}`)
        }
    }

    return {
        assets: assetsLoaded,
        errors: errors
    }
}

export async function deleteAssetAction(_: unknown, filePath: string) {
    if (!await isAuthenticated()) {
        return { error: "Não autorizado" }
    }

    try {
        const fileName = path.basename(filePath)
        const fullPath = path.join(process.cwd(), "public", "assets", fileName)

        await unlink(fullPath)

        return {
            success: true,
            message: `File ${filePath} deleted`,
            filePath: filePath
        }
    } catch {
        return { error: "Error deleting file" }
    }
}

export async function saveTagAction(_: unknown, tag: { id?: number; name: string; color?: string | null }) {
    if (!await isAuthenticated()) {
        return { error: "Não autorizado" }
    }

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
    } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
            return { error: "Tag with this name already exists" }
        }
        return { error: "Error saving tag" }
    }
}

export async function deleteTagAction(_: unknown, tag: { id: number; name?: string }) {
    if (!await isAuthenticated()) {
        return { error: "Não autorizado" }
    }

    try {
        await deleteTag(tag.id)
        return {
            success: true,
            message: `Tag ${tag.name || ''} deleted`,
            tagId: tag.id
        }
    } catch {
        return { error: "Error deleting tag" }
    }
}