import { NextRequest, NextResponse } from 'next/server';

interface CommentData {
  slug: string;
  author: string;
  content: string;
}

const commentsMap: Record<string, CommentData[]> = {};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, author, content } = body as CommentData;

  if (!slug || !author || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!commentsMap[slug]) {
    commentsMap[slug] = [];
  }

  const comment = {
    slug,
    author: author.trim(),
    content: content.trim(),
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };

  commentsMap[slug].push(comment);

  return NextResponse.json(comment, { status: 201 });
}
