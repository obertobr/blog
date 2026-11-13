import HomeFeed from "@/components/HomeFeed";
import { parseHomeFilterParams } from "../_lib/post-filter";
import { getRelevantPosts } from "../_lib/posts";
import { getVisitorHash } from "../_lib/visitor-server";

export default async function RelevantPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string | string[]; tag?: string | string[] }>;
}) {
    const [resolvedParams, visitorHash] = await Promise.all([
        searchParams,
        getVisitorHash(),
    ]);
    const { query, tag } = parseHomeFilterParams(resolvedParams);
    const { posts } = await getRelevantPosts(visitorHash);

    return (
        <HomeFeed
            initialPosts={posts}
            initialQuery={query}
            initialTag={tag}
            basePath="/relevant"
        />
    );
}
