'use client';

import { useState } from 'react';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
  initialLikes: number;
  slug: string;
}

export default function LikeButton({ initialLikes, slug }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    if (isLiked) return;

    setIsLiked(true);
    setLikes((prev) => prev + 1);
    setIsAnimating(true);

    try {
      await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
    } catch {
      setIsLiked(false);
      setLikes((prev) => prev - 1);
    }

    setTimeout(() => setIsAnimating(false), 600);
  };

  const buttonClass = [
    styles.likeButton,
    isLiked ? styles.liked : '',
    isAnimating ? styles.animate : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      onClick={handleLike}
      disabled={isLiked}
      className={buttonClass}
      aria-label={isLiked ? '已点赞' : '点赞'}
    >
      <span className={styles.heart}>{isLiked ? '❤️' : '🤍'}</span>
      <span className={styles.likeCount}>{likes}</span>
    </button>
  );
}
