import { Prisma } from "@prisma/client";
import Link from "next/link"

export type PostWithTags = Prisma.PostGetPayload<{
  include: { tags: true }
}>;

type PostCardProps = {
    post: PostWithTags
}

export default function PostCard({ post }: PostCardProps) {
    return (
        <Link href={`/post/${post.slug}`} className="relative
                                                     before:content-['']
                                                     before:absolute
                                                     before:top-1/2
                                                     before:-translate-x-1/2
                                                     before:-translate-y-1/2
                                                     before:h-3
                                                     before:w-3
                                                     before:bg-gray-50
                                                     before:rounded-full
                                                     before:left-[-19px]
                                                     before:border-3
                                                     before:border-gray-300
                                                     hover:before:border-gray-400
                                                     hover:before:h-3
                                                     hover:before:w-5
                                                     before:transition-all
                                                     before:duration-200
                                                     before:outline-2
                                                     before:outline-gray-50">
            <div className='p-3 rounded-md bg-white hover:bg-gray-50 border border-gray-300 shadow-sm hover:shadow-md transition-shadow duration-200'>
                <div className="flex justify-between items-center">
                    <span className='text-sm text-gray-500'>{post.createdAt.toDateString()}</span>
                    <div className="flex gap-2">
                        {post.tags?.map(tag => (
                            <span
                                className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                                style={{ backgroundColor: tag.color || '#d1d5dc' }}
                                key={tag.id}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>
                <h2 className='text-2xl font-bold'>{post.title || "Sem título"}</h2>
                <p className="line-clamp-2">{post.content}</p>
            </div>
        </Link>
    )
}