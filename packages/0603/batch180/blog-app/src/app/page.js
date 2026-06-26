import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'posts');

function getAllPosts() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const id = name.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, name);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      return {
        id,
        title: data.title,
        date: data.date,
        author: data.author,
        excerpt: data.excerpt,
      };
    });
}

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>📝 Next.js 博客</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          服务端组件 + 客户端组件混合架构演示
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {posts.map((post) => (
          <article
            key={post.id}
            style={{
              padding: '28px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #eee',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#888', marginBottom: '12px' }}>
              <span>{post.date}</span>
              <span>{post.author}</span>
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>
              <Link href={`/blog/${post.id}`} style={{ color: '#1a1a1a', textDecoration: 'none' }}>
                {post.title}
              </Link>
            </h2>
            <p style={{ color: '#555', marginBottom: '16px' }}>{post.excerpt}</p>
            <Link href={`/blog/${post.id}`} style={{ fontWeight: 600, fontSize: '15px', color: '#0070f3', textDecoration: 'none' }}>
              阅读全文 →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
