import { NextRequest, NextResponse } from 'next/server';

const likesMap: Record<string, number> = {};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug } = body;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  likesMap[slug] = (likesMap[slug] || 0) + 1;

  return NextResponse.json({ slug, likes: likesMap[slug] });
}
