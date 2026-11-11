'use server'

import prisma from "./prisma";

export async function getPosts() {
    return await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
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

export async function createPost(title: string, content: string, slug: string, tags: string[]) {
    try {
        return await prisma.post.create({
            data: {
                title,
                content,
                slug,
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
    } catch (err: any) {
        if (err.code === "P2002") {
            console.log(err.meta)
            throw new Error("Slug already exists")
        }
        throw new Error("Error creating post");
    }
}