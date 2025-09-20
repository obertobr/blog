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
        where: { slug }
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