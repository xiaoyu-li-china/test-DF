import { getPostById, getAllPostIds } from '@/lib/posts';
import LikeButton from '@/components/LikeButton.jsx';
import ReadingProgress from '@/components/ReadingProgress.jsx';
import TableOfContents from '@/components/TableOfContents.jsx';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const ids = getAllPostIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  try {
    const post = await getPostById(params.id);
    return {
      title: post.title,
      description: post.excerpt,
    };
  } catch {
    return { title: '文章未找到' };
  }
}

export default async function BlogPage({ params }) {
  let post;
  try {
    post = await getPostById(params.id);
  } catch {
    notFound();
  }

  return (
    <>
      <ReadingProgress />

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px', position: 'relative' }}>
        <nav style={{ marginBottom: '24px' }}>
          <Link href="/" style={{ fontSize: '15px', color: '#666', textDecoration: 'none' }}>
            ← 返回首页
          </Link>
        </nav>

        <div style={{ display: 'flex', gap: '40px' }}>
          <article style={{ background: 'white', borderRadius: '12px', padding: '40px', border: '1px solid #eee', flex: '1', minWidth: 0 }}>
            <header style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f0f0f0' }}>
              <h1 style={{ fontSize: '2rem', lineHeight: 1.3, marginBottom: '16px' }}>
                {post.title}
              </h1>
              <div style={{ display: 'flex', gap: '20px', color: '#888', fontSize: '15px' }}>
                <span>👤 {post.author}</span>
                <span>📅 {post.date}</span>
              </div>
            </header>

            <div
              style={{ fontSize: '16px', lineHeight: 1.8, color: '#333' }}
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <footer style={{ marginTop: '48px' }}>
              <div style={{ height: '2px', background: 'linear-gradient(to right, #0070f3, #ff4d4d)', borderRadius: '1px', marginBottom: '32px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '15px', color: '#666' }}>觉得有用？点个赞吧</span>
                <LikeButton articleId={post.id} />
              </div>
            </footer>
          </article>
        </div>

        <TableOfContents headings={post.headings} />
      </main>
    </>
  );
}
