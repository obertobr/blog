import { Prisma } from "@prisma/client";
import Link from "next/link";
import RelativeDate from "./RelativeDate";

export type PostWithTags = Prisma.PostGetPayload<{
  include: { tags: true }
}>;

type PostCardProps = {
    post: PostWithTags;
};

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
                                                     dark:before:bg-gh-canvas
                                                     before:rounded-full
                                                     before:left-[-19px]
                                                     before:border-3
                                                     before:border-gray-300
                                                     dark:before:border-gh-border
                                                     hover:before:border-gray-400
                                                     dark:hover:before:border-gh-muted
                                                     hover:before:h-3
                                                     hover:before:w-5
                                                     before:transition-all
                                                     before:duration-200
                                                     before:outline-2
                                                     before:outline-gray-50
                                                     dark:before:outline-gh-canvas">
            <div className='p-3 rounded-md bg-white dark:bg-gh-surface hover:bg-gray-50 dark:hover:bg-[#1c2128] border border-gray-300 dark:border-gh-border shadow-xs hover:shadow-md transition duration-200'>
                <div className="flex justify-between items-center mb-1">
                    <RelativeDate date={post.createdAt} className="text-sm text-gray-500 dark:text-gh-muted" />
                    <div className="flex gap-2">
                        {post.tags?.map(tag => (
                            <span
                                className="text-xs font-medium px-2.5 py-0.5 rounded-full text-gray-900"
                                style={{ backgroundColor: tag.color || '#d1d5dc' }}
                                key={tag.id}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-gh-text'>{post.title || "Sem título"}</h2>
                <p className="line-clamp-2 text-gray-600 dark:text-gh-muted mt-1">{post.content}</p>
            </div>
        </Link>
    );
}