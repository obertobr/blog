import { Prisma } from "@prisma/client";
import Link from "next/link";
import { buildTagFilterHref, normalizeSearchText } from "@/app/_lib/post-filter";
import RelativeDate from "./RelativeDate";
import ThumbsUpIcon from "./ThumbsUpIcon";

export type PostWithTags = Prisma.PostGetPayload<{
    include: {
        tags: true;
        _count: { select: { likes: true } };
    };
}> & {
    likes?: { id: number }[];
};

type PostCardProps = {
    post: PostWithTags;
    untitledLabel?: string;
    activeTagName?: string;
    onTagClick?: (tagName: string) => void;
};

export default function PostCard({
    post,
    untitledLabel = "Sem título",
    activeTagName = "",
    onTagClick,
}: PostCardProps) {
    const likesCount = post._count?.likes ?? 0;
    const isLiked = Boolean(post.likes && post.likes.length > 0);
    const normalizedActiveTag = normalizeSearchText(activeTagName);
    const displayTitle = post.title || untitledLabel;

    return (
        <article
            className="relative
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
                       dark:before:outline-gh-canvas"
        >
            <div className="relative p-3 rounded-md bg-white dark:bg-gh-surface hover:bg-gray-50 dark:hover:bg-[#1c2128] border border-gray-300 dark:border-gh-border shadow-xs hover:shadow-md transition duration-200">
                <Link
                    href={`/post/${post.slug}`}
                    aria-label={displayTitle}
                    className="absolute inset-0 rounded-md"
                />
                <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                        <RelativeDate date={post.createdAt} className="text-sm text-gray-500 dark:text-gh-muted" />
                        <span
                            className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${isLiked
                                ? "text-sky-600 dark:text-gh-blue"
                                : "text-gray-400 dark:text-gh-muted"
                                }`}
                        >
                            <ThumbsUpIcon filled={isLiked} className="w-3.5 h-3.5" />
                            {likesCount}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 relative z-1">
                        {post.tags?.map((tag) => {
                            const isTagActive =
                                normalizedActiveTag !== "" &&
                                normalizeSearchText(tag.name) === normalizedActiveTag;
                            const tagClasses = `text-xs font-medium px-2.5 py-0.5 rounded-full text-gray-900 transition-all cursor-pointer hover:brightness-95 ${
                                isTagActive ? "ring-2 ring-sky-600 dark:ring-gh-blue ring-offset-1 dark:ring-offset-gh-surface" : ""
                            }`;

                            if (onTagClick) {
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => onTagClick(tag.name)}
                                        aria-pressed={isTagActive}
                                        className={tagClasses}
                                        style={{ backgroundColor: tag.color || "#d1d5dc" }}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={tag.id}
                                    href={buildTagFilterHref(tag.name)}
                                    className={tagClasses}
                                    style={{ backgroundColor: tag.color || "#d1d5dc" }}
                                >
                                    {tag.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gh-text">{displayTitle}</h2>
                <p className="line-clamp-2 text-gray-600 dark:text-gh-muted mt-1">{post.content}</p>
            </div>
        </article>
    );
}
