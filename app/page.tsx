import HomeFeed from '@/components/HomeFeed';
import { parseHomeFilterParams } from './_lib/post-filter';
import { getPosts } from './_lib/posts';
import { getVisitorHash } from './_lib/visitor-server';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tag?: string | string[] }>;
}) {
  const [resolvedParams, visitorHash] = await Promise.all([
    searchParams,
    getVisitorHash(),
  ]);
  const { query, tag } = parseHomeFilterParams(resolvedParams);
  const posts = await getPosts({ visitorHash });

  return (
    <HomeFeed
      initialPosts={posts}
      initialQuery={query}
      initialTag={tag}
    />
  );
}
