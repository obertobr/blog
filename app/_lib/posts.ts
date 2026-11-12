'use server'

import prisma from "./prisma";

export async function getPosts(options?: { publishedOnly?: boolean }) {
    const publishedOnly = options?.publishedOnly ?? true;
    return await prisma.post.findMany({
        where: publishedOnly ? { published: true } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { tags: true }
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


export async function getPostBySlug(slug: string) {
    return await prisma.post.findUnique({
        where: { slug },
        include: { tags: true }
    })
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