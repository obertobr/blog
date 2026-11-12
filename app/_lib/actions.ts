'use server'
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createPost, createPostComment, createTag, deletePost, deletePostComment, deleteTag, getDrafts, getPostById, getPostBySlug, isAssetUsedInOtherPosts, recordPostRead, togglePostLike, updatePost, updateTag } from "./posts"
import { extractAssetUrls, slugify } from "./util"
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises"
import { clearAdminSession, isAuthenticated, isValidPassword, setAdminSession } from "./auth"
import { visitorHashSchema } from "./visitor"
import { getOrCreateVisitorHashForAction, getVisitorHash, restoreVisitorHashCookie } from "./visitor-server"
import { CommentErrorCode, CreateCommentInput, PublicComment, validateAndPrepareComment } from "./comment"

const postIdSchema = z.number().int().positive();

export type formPost = {
    id?: number;
    title?: string | null;
    content: string;
    tags: string[];
    description?: string;
    slug?: string;
    assets?: string[];
    published?: boolean;
}

export type FormPostState = {
    message: string;
    slug?: string | null;
    postId?: number | null;
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

    const title = formPost.title?.trim() || ""
    if (!title) {
        return { ...initialState, message: "Título é obrigatório para publicar o post", formPost }
    }

    const content = formPost.content || ""
    const tags = formPost.tags || []

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

    if (formPost.id) {
        try {
            let slug = slugify(title);
            const existing = await getPostBySlug(slug);
            if (existing && existing.id !== formPost.id) {
                slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
            }

            const post = await updatePost(formPost.id, {
                title,
                content,
                slug,
                tags,
                published: true,
            });

            return { ...initialState, message: "Post publicado com sucesso", slug: post.slug, postId: post.id };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error publishing post";
            return { ...initialState, message, formPost };
        }
    }

    try {
        let slug = slugify(title);
        const existing = await getPostBySlug(slug);
        if (existing) {
            slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
        }

        const post = await createPost(title, content, slug, tags, true)
        const message = "Post criado com sucesso"
        return { ...initialState, message, slug: post.slug, postId: post.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Error creating post"
        return { ...initialState, message, formPost }
    }
}

export type SaveDraftInput = {
    id?: number;
    title?: string | null;
    content: string;
    tags: string[];
    keepPublished?: boolean;
};

export type SaveDraftResult = {
    success: boolean;
    id?: number;
    slug?: string;
    message?: string;
    error?: string;
};

export async function saveDraftAction(
    firstOrInput: unknown,
    secondInput?: SaveDraftInput
): Promise<SaveDraftResult> {
    if (!await isAuthenticated()) {
        return { success: false, error: "Não autorizado" };
    }

    const input = (secondInput && typeof secondInput === "object" ? secondInput : firstOrInput) as SaveDraftInput;
    if (!input || typeof input !== "object") {
        return { success: false, error: "Dados inválidos para o rascunho" };
    }

    const title = input.title?.trim() || null;
    const content = input.content || "";
    const tags = input.tags || [];

    try {
        if (input.id) {
            const updated = await updatePost(input.id, {
                title,
                content,
                tags,
                published: input.keepPublished ? true : false,
            });
            return {
                success: true,
                id: updated.id,
                slug: updated.slug,
                message: input.keepPublished ? "Post atualizado" : "Rascunho atualizado",
            };
        }

        let baseSlug = "rascunho";
        if (title) {
            baseSlug = slugify(title) || "rascunho";
        } else if (content.trim()) {
            const firstLine = content.trim().split("\n")[0].replace(/[#*`_>]/g, "").trim();
            const derivedSlug = slugify(firstLine);
            if (derivedSlug) {
                baseSlug = derivedSlug.slice(0, 30);
            }
        }

        const uniqueSuffix = crypto.randomBytes(4).toString("hex");
        const slug = `${baseSlug}-${uniqueSuffix}`;

        const created = await createPost(title, content, slug, tags, false);
        return {
            success: true,
            id: created.id,
            slug: created.slug,
            message: "Rascunho salvo",
        };
    } catch (err) {
        console.error("saveDraftAction error:", err);
        const error = err instanceof Error ? err.message : "Erro ao salvar rascunho";
        return { success: false, error };
    }
}

export async function listDraftsAction(): Promise<{ drafts: Array<{ id: number; title: string | null; slug: string; updatedAt: string; content: string; tags: string[] }>; error?: string }> {
    if (!await isAuthenticated()) {
        return { drafts: [], error: "Não autorizado" };
    }

    try {
        const drafts = await getDrafts();
        return {
            drafts: drafts.map(d => ({
                id: d.id,
                title: d.title,
                slug: d.slug,
                updatedAt: d.updatedAt.toISOString(),
                content: d.content,
                tags: d.tags.map(t => t.name),
            })),
        };
    } catch (err) {
        console.error("listDraftsAction error:", err);
        const error = err instanceof Error ? err.message : "Erro ao listar rascunhos";
        return { drafts: [], error };
    }
}

export async function getPostForEditAction(id: number) {
    if (!await isAuthenticated()) {
        return { post: null, error: "Não autorizado" };
    }

    const post = await getPostById(id);
    if (!post) {
        return { post: null, error: "Post não encontrado" };
    }

    const assetFileNames = extractAssetUrls(post.content || "");
    const assets = assetFileNames.map(name => `/assets/${encodeURI(name)}`);

    return {
        post: {
            id: post.id,
            title: post.title,
            slug: post.slug,
            content: post.content,
            published: post.published,
            tags: post.tags.map(t => t.name),
            assets,
        },
    };
}

export async function unpublishPostAction(id: number) {
    if (!await isAuthenticated()) {
        return { success: false, error: "Não autorizado" };
    }

    try {
        const post = await updatePost(id, { published: false });
        return { success: true, message: "Post despublicado e movido para rascunhos", slug: post.slug };
    } catch {
        return { success: false, error: "Erro ao despublicar post" };
    }
}


export async function saveAssetAction(_: unknown, fileList: FileList | File[]) {
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
            let ext = path.extname(file.name).toLowerCase()
            if (!ext && file.type) {
                if (file.type.includes("jpeg") || file.type.includes("jpg")) ext = ".jpg"
                else if (file.type.includes("png")) ext = ".png"
                else if (file.type.includes("gif")) ext = ".gif"
                else if (file.type.includes("webp")) ext = ".webp"
                else if (file.type.includes("svg")) ext = ".svg"
                else if (file.type.includes("avif")) ext = ".avif"
            }
            if (!ext) ext = ".png"

            if (!allowedExtensions.includes(ext)) {
                errors.push(`Arquivo "${file.name}" não é uma imagem suportada.`)
                continue
            }

            if (file.size > 10 * 1024 * 1024) {
                errors.push(`Imagem "${file.name}" excede o limite máximo de 10MB.`)
                continue
            }

            const rawBase = path.basename(file.name, path.extname(file.name))
            const cleanBase = rawBase === "blob" || rawBase === "image" ? "imagem" : rawBase
            const safeBase = slugify(cleanBase) || "imagem"
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
        const decoded = decodeURIComponent(fileName)

        const isUsed = (await isAssetUsedInOtherPosts(fileName)) || (await isAssetUsedInOtherPosts(decoded))
        if (isUsed) {
            return {
                success: true,
                deletedFromDisk: false,
                message: `Imagem ${fileName} removida dos assets do post`,
                filePath: filePath
            }
        }

        const fullPath = path.join(process.cwd(), "public", "assets", fileName)
        await unlink(fullPath)

        return {
            success: true,
            deletedFromDisk: true,
            message: `Imagem ${fileName} excluída com sucesso`,
            filePath: filePath
        }
    } catch {
        return { error: "Erro ao excluir imagem" }
    }
}

export async function listAvailableAssetsAction(): Promise<{ assets: { url: string; name: string }[]; error?: string }> {
    if (!await isAuthenticated()) {
        return { assets: [], error: "Não autorizado" };
    }

    try {
        const uploadDir = path.join(process.cwd(), "public", "assets");
        await mkdir(uploadDir, { recursive: true });

        const entries = await readdir(uploadDir, { withFileTypes: true });
        const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];

        const assets: { url: string; name: string; mtime: number }[] = [];

        for (const entry of entries) {
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (allowedExtensions.includes(ext)) {
                    const filePath = path.join(uploadDir, entry.name);
                    const fileStat = await stat(filePath).catch(() => null);
                    assets.push({
                        url: `/assets/${entry.name}`,
                        name: entry.name,
                        mtime: fileStat ? fileStat.mtimeMs : 0,
                    });
                }
            }
        }

        assets.sort((a, b) => b.mtime - a.mtime);

        return {
            assets: assets.map(({ url, name }) => ({ url, name })),
        };
    } catch {
        return { assets: [], error: "Erro ao listar imagens" };
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

export async function toggleLikeAction(postId: number): Promise<
    { success: true; liked: boolean; likesCount: number } | { error: string }
> {
    const parsedId = postIdSchema.safeParse(postId);
    if (!parsedId.success) {
        return { error: "Invalid post id" };
    }

    try {
        const visitorHash = await getOrCreateVisitorHashForAction();
        const result = await togglePostLike(parsedId.data, visitorHash);
        revalidatePath("/");
        revalidatePath(`/post/${result.slug}`);
        return {
            success: true,
            liked: result.liked,
            likesCount: result.likesCount,
        };
    } catch {
        return { error: "Error toggling like" };
    }
}

export async function recordPostReadAction(postId: number): Promise<{ success: boolean }> {
    const parsedId = postIdSchema.safeParse(postId);
    if (!parsedId.success) {
        return { success: false };
    }

    try {
        const visitorHash = await getOrCreateVisitorHashForAction();
        await recordPostRead(parsedId.data, visitorHash);
        return { success: true };
    } catch {
        return { success: false };
    }
}

export async function restoreVisitorHashAction(hash: string): Promise<{ success: boolean }> {
    const parsed = visitorHashSchema.safeParse(hash);
    if (!parsed.success) {
        return { success: false };
    }

    try {
        await restoreVisitorHashCookie(parsed.data);
        return { success: true };
    } catch {
        return { success: false };
    }
}

export type CreateCommentActionResult =
    | { success: true; comment: PublicComment }
    | { success: false; errorCode: CommentErrorCode; retryAfterSeconds?: number };

export async function createCommentAction(input: CreateCommentInput): Promise<CreateCommentActionResult> {
    const validation = validateAndPrepareComment(input);
    if (!validation.ok) {
        return { success: false, errorCode: validation.errorCode };
    }

    try {
        const visitorHash = await getOrCreateVisitorHashForAction();
        const result = await createPostComment(validation.data, visitorHash);

        if (!result.ok) {
            return {
                success: false,
                errorCode: result.errorCode,
                retryAfterSeconds: result.retryAfterSeconds,
            };
        }

        revalidatePath("/");
        revalidatePath(`/post/${result.slug}`);
        return { success: true, comment: result.comment };
    } catch {
        return { success: false, errorCode: CommentErrorCode.GenericError };
    }
}

export async function deleteCommentAction(commentId: number): Promise<
    { success: true } | { success: false; errorCode: CommentErrorCode }
> {
    const parsedId = postIdSchema.safeParse(commentId);
    if (!parsedId.success) {
        return { success: false, errorCode: CommentErrorCode.InvalidInput };
    }

    try {
        const [isAdmin, visitorHash] = await Promise.all([
            isAuthenticated(),
            getVisitorHash(),
        ]);

        const result = await deletePostComment(parsedId.data, { isAdmin, visitorHash });
        if (!result.ok) {
            return { success: false, errorCode: result.errorCode };
        }

        revalidatePath("/");
        revalidatePath(`/post/${result.slug}`);
        return { success: true };
    } catch {
        return { success: false, errorCode: CommentErrorCode.GenericError };
    }
}