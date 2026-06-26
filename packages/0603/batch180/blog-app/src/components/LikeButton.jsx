'use client';

import { useState } from 'react';

export default function LikeButton({ articleId }) {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    if (liked) return;

    setLiked(true);
    setLikes((prev) => prev + 1);
    setIsAnimating(true);

    try {
      await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: articleId }),
      });
    } catch {
      setLiked(false);
      setLikes((prev) => prev - 1);
    }

    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <button
      onClick={handleLike}
      disabled={liked}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        border: `2px solid ${liked ? '#ff4d4d' : '#e0e0e0'}`,
        borderRadius: '9999px',
        background: liked ? '#fff0f0' : '#ffffff',
        cursor: liked ? 'default' : 'pointer',
        fontSize: '16px',
        transition: 'all 0.2s ease',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
      }}
      aria-label={liked ? '已点赞' : '点赞'}
    >
      <span style={{ display: 'inline-block', animation: isAnimating ? 'likePop 0.6s ease' : 'none' }}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span style={{ fontWeight: 600, minWidth: '20px', color: liked ? '#e03030' : 'inherit' }}>
        {likes}
      </span>
      <style>{`
        @keyframes likePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        button:disabled:hover {
          border-color: #ff4d4d;
          background: #fff5f5;
          transform: scale(1.05);
        }
      `}</style>
    </button>
  );
}
