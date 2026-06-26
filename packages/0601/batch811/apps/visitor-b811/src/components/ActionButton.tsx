import React, { useState, useCallback } from 'react';

interface ActionButtonProps {
  onClick: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
  loadingText = '处理中...',
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      const result = onClick();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setIsLoading(false);
    }
  }, [onClick, isLoading, disabled]);

  return (
    <button
      className={`btn ${className}`}
      onClick={handleClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <span className="loading-spinner"></span>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default ActionButton;
