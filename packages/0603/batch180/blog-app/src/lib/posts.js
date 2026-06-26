import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'posts');

export function getAllPostIds() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''));
}

function extractHeadings(content) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '');
    headings.push({ id, text, level });
  }
  return headings;
}

function injectHeadingIds(contentHtml, headings) {
  let result = contentHtml;
  for (const heading of headings) {
    const escapedText = heading.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hTag = `h${heading.level}`;
    const openTagRegex = new RegExp(`<${hTag}>([^<]*${escapedText}[^<]*)</${hTag}>`);
    const match = result.match(openTagRegex);
    if (match) {
      result = result.replace(
        match[0],
        `<${hTag} id="${heading.id}">${match[1]}</${hTag}>`
      );
    }
  }
  return result;
}

export async function getPostById(id) {
  const fullPath = path.join(postsDirectory, `${id}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const headings = extractHeadings(content);

  const processedContent = await remark().use(html).process(content);
  const rawHtml = processedContent.toString();

  const contentHtml = injectHeadingIds(rawHtml, headings);

  return {
    id,
    title: data.title,
    date: data.date,
    author: data.author,
    excerpt: data.excerpt,
    contentHtml,
    headings,
  };
}
