import { getPosts } from './_lib/posts'
import PostCard from '@/components/PostCard';

export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="max-w-4xl
                    mx-auto
                    p-4
                    pl-10
                    flex
                    flex-col
                    gap-3
                    relative
                    before:content-['']
                    before:absolute
                    before:top-0
                    before:bottom-0
                    before:left-5
                    before:border-l-2
                    before:border-dotted
                    before:border-gray-300">
      {posts.map(post => (
        <PostCard post={post} key={post.slug}/>
      ))}
    </div>
  );
}
