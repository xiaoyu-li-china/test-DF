'use client';

import { useState, FormEvent } from 'react';
import styles from './CommentForm.module.css';

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CommentFormProps {
  slug: string;
}

export default function CommentForm({ slug }: CommentFormProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      setError('请填写昵称和评论内容');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, author: author.trim(), content: content.trim() }),
      });

      if (!res.ok) throw new Error('提交失败');

      const newComment: Comment = {
        id: Date.now().toString(),
        author: author.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      setComments((prev) => [newComment, ...prev]);
      setContent('');
    } catch {
      setError('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.commentSection}>
      <h2>评论区 ({comments.length})</h2>

      <form onSubmit={handleSubmit} className={styles.commentForm}>
        <div className={styles.formGroup}>
          <label htmlFor="author">昵称</label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="输入昵称"
            className={styles.formInput}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="content">评论</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法..."
            rows={4}
            className={styles.formTextarea}
          />
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitButton}
        >
          {isSubmitting ? '提交中...' : '发表评论'}
        </button>
      </form>

      <div className={styles.commentList}>
        {comments.map((comment) => (
          <div key={comment.id} className={styles.commentItem}>
            <div className={styles.commentHeader}>
              <span className={styles.commentAuthor}>{comment.author}</span>
              <span className={styles.commentTime}>
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className={styles.commentContent}>{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
