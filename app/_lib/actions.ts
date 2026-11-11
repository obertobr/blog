'use server'
import path from "path";
import crypto from "crypto";
import { createPost, createTag, deletePost, deleteTag, getPostById, isAssetUsedInOtherPosts, updateTag } from "./posts"
import { extractAssetUrls, slugify } from "./util"
import { mkdir, unlink, writeFile } from "fs/promises"
import { clearAdminSession, isAuthenticated, isValidPassword, setAdminSession } from "./auth"

export type formPost = {
    title: string;
    content: string;
    tags: string[];
    description?: string;
    slug?: string;
    assets?: string[];
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

    if (formPost.assets && formPost.assets.length > 0) {
        const unusedAssets = formPost.assets.filter(assetUrl => {
            const fileName = path.basename(assetUrl)
            const decoded = decodeURIComponent(fileName)
            const encoded = encodeURI(fileName)
            return !content.includes(fileName) && !content.includes(decoded) && !content.includes(encoded) && !content.includes(assetUrl)
        })

        if (unusedAssets.length > 0) {
            const names = unusedAssets.map(a => path.basename(decodeURIComponent(a))).join(", ")
            return {
                ...initialState,
                message: `Não é permitido publicar: as seguintes imagens foram enviadas mas não estão no conteúdo: ${names}`,
                formPost
            }
        }
    }

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

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]

    for (const file of fileList) {
        try {
            const ext = path.extname(file.name).toLowerCase()
            if (!allowedExtensions.includes(ext)) {
                errors.push(`Arquivo "${file.name}" não é uma imagem suportada.`)
                continue
            }

            if (file.size > 10 * 1024 * 1024) {
                errors.push(`Imagem "${file.name}" excede o limite máximo de 10MB.`)
                continue
            }

            const rawBase = path.basename(file.name, ext)
            const safeBase = slugify(rawBase) || "asset"
            const uniqueSuffix = crypto.randomBytes(4).toString("hex")
            const fileName = `${safeBase}-${uniqueSuffix}${ext}`
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

export async function deletePostAction(_: unknown, id: number) {
    if (!await isAuthenticated()) {
        return { error: "Não autorizado" }
    }

    try {
        const post = await getPostById(id)
        if (!post) {
            return { error: "Post não encontrado" }
        }

        const assetNames = extractAssetUrls(post.content || "")
        await deletePost(id)

        const uploadDir = path.join(process.cwd(), "public", "assets")
        for (const assetName of assetNames) {
            const isUsedElsewhere = await isAssetUsedInOtherPosts(assetName, id)
            if (!isUsedElsewhere) {
                const safeName = path.basename(assetName)
                const filePath = path.join(uploadDir, safeName)
                try {
                    await unlink(filePath)
                } catch {
                    // Arquivo já removido ou não encontrado
                }
            }
        }

        return {
            success: true,
            message: "Post excluído com sucesso",
            postId: id
        }
    } catch {
        return { error: "Erro ao excluir post" }
    }
}