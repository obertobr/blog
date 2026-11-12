'use server'

import prisma from "./prisma";
import {
    COMMENT_BURST_MAX_COUNT,
    COMMENT_DUPLICATE_WINDOW_MS,
    CommentErrorCode,
    evaluateCommentRateLimit,
    PreparedComment,
    PublicComment,
} from "./comment";

function buildPostInclude(visitorHash?: string | null) {
    return {
        tags: true,
        _count: { select: { likes: true } },
        ...(visitorHash ? {
            likes: {
                where: { visitor: { hash: visitorHash } },
                select: { id: true },
            },
        } : {}),
    };
}

export async function getPosts(options?: { publishedOnly?: boolean; visitorHash?: string | null }) {
    const publishedOnly = options?.publishedOnly ?? true;
    return await prisma.post.findMany({
        where: publishedOnly ? { published: true } : undefined,
        orderBy: { createdAt: 'desc' },
        include: buildPostInclude(options?.visitorHash),
    });
}

export async function getDrafts() {
    return await prisma.post.findMany({
        where: { published: false },
        orderBy: { updatedAt: 'desc' },
        include: { tags: true }
    });
}

export async function getTags() {
    return await prisma.tag.findMany();
}


export async function getPostBySlug(slug: string, visitorHash?: string | null) {
    return await prisma.post.findUnique({
        where: { slug },
        include: buildPostInclude(visitorHash),
    });
}

export async function getPostById(id: number) {
    return await prisma.post.findUnique({
        where: { id },
        include: { tags: true }
    })
}

export async function deletePost(id: number) {
    return await prisma.post.delete({
        where: { id }
    })
}

export async function isAssetUsedInOtherPosts(fileName: string, excludePostId?: number): Promise<boolean> {
    const encoded = encodeURI(fileName);
    const count = await prisma.post.count({
        where: {
            ...(excludePostId ? { id: { not: excludePostId } } : {}),
            OR: [
                { content: { contains: fileName } },
                { content: { contains: encoded } },
            ],
        },
    });
    return count > 0;
}

export async function createTag(name: string, color?: string | null) {
    return await prisma.tag.create({
        data: {
            name,
            color
        }
    })
}

export async function updateTag(id: number, data: { name?: string; color?: string | null }) {
    return await prisma.tag.update({
        where: { id },
        data
    })
}

export async function deleteTag(id: number) {
    return await prisma.tag.delete({
        where: { id }
    })
}

export async function createPost(title: string | null, content: string, slug: string, tags: string[], published: boolean = true) {
    try {
        return await prisma.post.create({
            data: {
                title: title ?? null,
                content,
                slug,
                published,
                ...(tags.length > 0 ? {
                    tags: {
                        connectOrCreate: tags.map((tagName) => ({
                            where: { name: tagName },
                            create: { name: tagName }
                        }))
                    }
                } : {})
            }
        })
    } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
            throw new Error("Slug already exists")
        }
        throw new Error("Error creating post");
    }
}

export async function updatePost(
    id: number,
    data: {
        title?: string | null;
        content?: string;
        slug?: string;
        tags?: string[];
        published?: boolean;
    }
) {
    try {
        return await prisma.post.update({
            where: { id },
            data: {
                ...(data.title !== undefined ? { title: data.title ?? null } : {}),
                ...(data.content !== undefined ? { content: data.content } : {}),
                ...(data.slug !== undefined ? { slug: data.slug } : {}),
                ...(data.published !== undefined ? { published: data.published } : {}),
                ...(data.tags !== undefined ? {
                    tags: {
                        set: [],
                        connectOrCreate: data.tags.map((tagName) => ({
                            where: { name: tagName },
                            create: { name: tagName }
                        }))
                    }
                } : {})
            },
            include: { tags: true }
        });
    } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
            throw new Error("Slug already exists")
        }
        throw new Error("Error updating post");
    }
}

export async function togglePostLike(
    postId: number,
    visitorHash: string
): Promise<{ liked: boolean; likesCount: number; slug: string }> {
    return await prisma.$transaction(async (tx) => {
        const post = await tx.post.findUnique({
            where: { id: postId },
            select: { id: true, slug: true, published: true },
        });

        if (!post || !post.published) {
            throw new Error("Post not found");
        }

        const visitor = await tx.visitor.upsert({
            where: { hash: visitorHash },
            update: { lastSeen: new Date() },
            create: { hash: visitorHash },
        });

        const existingLike = await tx.postLike.findUnique({
            where: {
                postId_visitorId: {
                    postId: post.id,
                    visitorId: visitor.id,
                },
            },
        });

        let liked: boolean;
        if (existingLike) {
            await tx.postLike.delete({
                where: { id: existingLike.id },
            });
            liked = false;
        } else {
            await tx.postLike.create({
                data: {
                    postId: post.id,
                    visitorId: visitor.id,
                },
            });
            liked = true;
        }

        const likesCount = await tx.postLike.count({
            where: { postId: post.id },
        });

        return { liked, likesCount, slug: post.slug };
    });
}

export async function recordPostRead(postId: number, visitorHash: string): Promise<void> {
    const post = await prisma.post.findFirst({
        where: { id: postId, published: true },
        select: { id: true },
    });

    if (!post) {
        return;
    }

    const visitor = await prisma.visitor.upsert({
        where: { hash: visitorHash },
        update: { lastSeen: new Date() },
        create: { hash: visitorHash },
    });

    await prisma.postRead.upsert({
        where: {
            postId_visitorId: {
                postId: post.id,
                visitorId: visitor.id,
            },
        },
        update: {
            readCount: { increment: 1 },
            lastRead: new Date(),
        },
        create: {
            postId: post.id,
            visitorId: visitor.id,
            readCount: 1,
        },
    });
}

function toPublicComment(
    row: {
        id: number;
        postId: number;
        authorName: string | null;
        isAnonymous: boolean;
        content: string;
        createdAt: Date;
        visitor: { hash: string };
    },
    visitorHash?: string | null
): PublicComment {
    return {
        id: row.id,
        postId: row.postId,
        authorName: row.isAnonymous ? null : row.authorName,
        isAnonymous: row.isAnonymous,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        isOwn: Boolean(visitorHash && row.visitor.hash === visitorHash),
    };
}

export async function getPostComments(postId: number, visitorHash?: string | null): Promise<PublicComment[]> {
    const rows = await prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            postId: true,
            authorName: true,
            isAnonymous: true,
            content: true,
            createdAt: true,
            visitor: { select: { hash: true } },
        },
    });

    return rows.map((row) => toPublicComment(row, visitorHash));
}

export async function getVisitorDisplayName(visitorHash?: string | null): Promise<string | null> {
    if (!visitorHash) return null;
    const visitor = await prisma.visitor.findUnique({
        where: { hash: visitorHash },
        select: { displayName: true },
    });
    return visitor?.displayName ?? null;
}

export type CreatePostCommentResult =
    | { ok: true; slug: string; comment: PublicComment }
    | { ok: false; errorCode: CommentErrorCode; retryAfterSeconds?: number };

export async function createPostComment(
    data: PreparedComment,
    visitorHash: string
): Promise<CreatePostCommentResult> {
    return await prisma.$transaction(async (tx) => {
        const post = await tx.post.findUnique({
            where: { id: data.postId },
            select: { id: true, slug: true, published: true },
        });

        if (!post || !post.published) {
            return { ok: false, errorCode: CommentErrorCode.PostNotFound };
        }

        const visitor = await tx.visitor.upsert({
            where: { hash: visitorHash },
            update: {
                lastSeen: new Date(),
                ...(!data.isAnonymous && data.authorName ? { displayName: data.authorName } : {}),
            },
            create: {
                hash: visitorHash,
                ...(!data.isAnonymous && data.authorName ? { displayName: data.authorName } : {}),
            },
        });

        const now = new Date();

        const recentComments = await tx.comment.findMany({
            where: { visitorId: visitor.id },
            orderBy: { createdAt: "desc" },
            take: COMMENT_BURST_MAX_COUNT,
            select: { createdAt: true },
        });

        const rateCheck = evaluateCommentRateLimit(
            recentComments.map((item) => item.createdAt.getTime()),
            now.getTime()
        );

        if (!rateCheck.allowed) {
            return {
                ok: false,
                errorCode: rateCheck.errorCode,
                retryAfterSeconds: rateCheck.retryAfterSeconds,
            };
        }

        const duplicate = await tx.comment.findFirst({
            where: {
                postId: post.id,
                visitorId: visitor.id,
                content: data.content,
                createdAt: { gte: new Date(now.getTime() - COMMENT_DUPLICATE_WINDOW_MS) },
            },
            select: { id: true },
        });

        if (duplicate) {
            return { ok: false, errorCode: CommentErrorCode.Duplicate };
        }

        const created = await tx.comment.create({
            data: {
                postId: post.id,
                visitorId: visitor.id,
                authorName: data.isAnonymous ? null : data.authorName,
                isAnonymous: data.isAnonymous,
                content: data.content,
            },
            select: {
                id: true,
                postId: true,
                authorName: true,
                isAnonymous: true,
                content: true,
                createdAt: true,
                visitor: { select: { hash: true } },
            },
        });

        return {
            ok: true,
            slug: post.slug,
            comment: toPublicComment(created, visitorHash),
        };
    });
}

export async function deletePostComment(
    commentId: number,
    options: { isAdmin: boolean; visitorHash?: string | null }
): Promise<{ ok: true; slug: string } | { ok: false; errorCode: CommentErrorCode }> {
    const existing = await prisma.comment.findUnique({
        where: { id: commentId },
        select: {
            id: true,
            post: { select: { slug: true } },
            visitor: { select: { hash: true } },
        },
    });

    if (!existing) {
        return { ok: false, errorCode: CommentErrorCode.PostNotFound };
    }

    const isOwner = Boolean(options.visitorHash && existing.visitor.hash === options.visitorHash);
    if (!options.isAdmin && !isOwner) {
        return { ok: false, errorCode: CommentErrorCode.Unauthorized };
    }

    await prisma.comment.delete({
        where: { id: existing.id },
    });

    return { ok: true, slug: existing.post.slug };
}