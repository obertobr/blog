import React from 'react';
import { getPosts } from './_lib/posts'
import Link from 'next/link';

export default async function Home() {
  const posts = await getPosts();

  return (
    <div className="">
      {posts.map(post => (
        <React.Fragment key={post.id}>
          <Link href={`/post/${post.slug}`}>
            <div className='m-5 p-2 hover:cursor-pointer hover:bg-gray-600 rounded-lg transition'>
              <h1 className='text-2xl font-bold'>{post.title}</h1>
              <span className='text-sm text-gray-300'>{post.createdAt.toDateString()}</span>
            </div>
          </Link>
          <hr></hr>
        </React.Fragment>
      ))}
    </div>
  );
}
