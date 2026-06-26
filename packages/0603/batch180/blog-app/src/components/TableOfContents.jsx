'use client';

import { useState, useEffect } from 'react';

export default function TableOfContents({ headings }) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!headings || headings.length === 0) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        top: '100px',
        right: 'max(20px, calc((100vw - 860px) / 2))',
        width: '220px',
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
        padding: '16px',
        background: 'white',
        borderRadius: '10px',
        border: '1px solid #eee',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        fontSize: '13px',
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: '#1a1a1a' }}>
        📑 文章目录
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          return (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: heading.level === 3 ? '4px 0 4px 16px' : '4px 0',
                  fontSize: '13px',
                  color: isActive ? '#0070f3' : '#666',
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '3px solid #0070f3' : '3px solid transparent',
                  paddingLeft: heading.level === 3
                    ? isActive ? '13px' : '13px'
                    : isActive ? '9px' : '9px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  marginBottom: '2px',
                }}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
