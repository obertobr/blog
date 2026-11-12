import { getPostBySlug, getPostComments, getVisitorDisplayName } from "@/app/_lib/posts"
import { markdownToHtml } from "@/app/_lib/util"
import { notFound } from "next/navigation"
import { isAuthenticated } from "@/app/_lib/auth"
import { selectPluralForm } from "@/app/_lib/i18n"
import { getServerDictionary } from "@/app/_lib/i18n-server"
import { getVisitorHash } from "@/app/_lib/visitor-server"
import CommentIcon from "@/components/CommentIcon"
import CommentsSection from "@/components/CommentsSection"
import DeletePostButton from "@/components/DeletePostButton"
import LikeButton from "@/components/LikeButton"
import PostReadTracker from "@/components/PostReadTracker"
import RelativeDate from "@/components/RelativeDate"
import Link from "next/link"

export default async function Post({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const visitorHash = await getVisitorHash()
    const [post, isAuth, { locale, t }] = await Promise.all([
        getPostBySlug(slug, visitorHash),
        isAuthenticated(),
        getServerDictionary(),
    ])

    if (!post) {
        notFound()
    }

    if (!post.published && !isAuth) {
        notFound()
    }

    const [contentRemark, comments, savedName] = await Promise.all([
        markdownToHtml(post.content || ""),
        post.published ? getPostComments(post.id, visitorHash) : Promise.resolve([]),
        post.published ? getVisitorDisplayName(visitorHash) : Promise.resolve(null),
    ])
    const initialLikesCount = post._count?.likes ?? 0
    const initialLiked = Boolean(post.likes && post.likes.length > 0)
    const commentsCount = comments.length

    return (
        <div className="max-w-4xl mx-auto">
            <div className="m-5 bg-white dark:bg-gh-surface border border-gray-300 dark:border-gh-border rounded-lg shadow-xs">
                <header className="border-b border-gray-300 dark:border-gh-border p-6 pt-4 pb-6">
                    <h1 className="text-3xl sm:text-5xl mb-3 font-bold text-gray-900 dark:text-gh-text">{post.title || t.post.untitledDraft}</h1>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <RelativeDate date={post.createdAt} locale={locale} prefix={t.post.published} className="text-gray-600 dark:text-gh-muted" />
                            {!post.published && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    {t.post.draft}
                                </span>
                            )}
                            {isAuth && (
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/createPost?id=${post.id}`}
                                        className="text-xs text-sky-600 hover:text-sky-800 dark:text-gh-blue dark:hover:text-gh-blue-hover hover:font-bold cursor-pointer transition-all"
                                    >
                                        {post.published ? t.post.editPost : t.post.editDraft}
                                    </Link>
                                    <span className="text-gray-300 dark:text-gh-border">•</span>
                                    <DeletePostButton postId={post.id} />
                                </div>
                            )}
                        </div>
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
                </header>
                <article className="prose dark:prose-invert max-w-none p-6 pt-5 prose-hr:mt-3 prose-hr:mb-3">
                    <div dangerouslySetInnerHTML={{ __html: contentRemark }} />
                </article>
                {post.published && (
                    <>
                        <PostReadTracker postId={post.id} />
                        <footer className="border-t border-gray-300 dark:border-gh-border px-6 py-4 bg-gray-50/50 dark:bg-gh-subtle/30 rounded-b-lg flex items-center justify-between gap-4 flex-wrap">
                            <LikeButton
                                postId={post.id}
                                initialLiked={initialLiked}
                                initialLikesCount={initialLikesCount}
                            />
                            <a
                                href="#comments"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gh-muted hover:text-gray-900 dark:hover:text-gh-text transition-colors"
                            >
                                <CommentIcon className="w-4 h-4" />
                                <span className="tabular-nums">{commentsCount}</span>
                                <span>
                                    {selectPluralForm(
                                        commentsCount,
                                        t.comments.countSingular,
                                        t.comments.countPlural
                                    )}
                                </span>
                            </a>
                        </footer>
                    </>
                )}
            </div>
            {post.published && (
                <CommentsSection
                    postId={post.id}
                    initialComments={comments}
                    initialSavedName={savedName}
                    isAdmin={isAuth}
                />
            )}
        </div>
    )
}