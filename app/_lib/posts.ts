import prisma from "./prisma";

export async function getPosts() {
    return await prisma.post.findMany({
        orderBy: { createdAt: 'desc'}
    });
}

export async function getPostBySlug(slug: string) {
    return await prisma.post.findUnique({
        where:{ slug }
    })
}

export async function createPost(title:string, content: string, slug: string) {
    return await prisma.post.create({
        data: {title, content, slug}
    })
}