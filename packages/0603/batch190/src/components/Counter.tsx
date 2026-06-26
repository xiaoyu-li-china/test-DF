import { useCounterStore } from '../store/useCounterStore'

function Counter() {
  const { count, loading, error, increment, decrement, incrementAsync, reset, clearError } =
    useCounterStore()

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Zustand 计数器</h1>

      <div style={{ fontSize: '4rem', fontWeight: 'bold', margin: '2rem 0' }}>{count}</div>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            margin: '1rem 0',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '4px',
          }}
        >
          {error}
          <button
            onClick={clearError}
            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
        <button
          onClick={decrement}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1.25rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          -
        </button>
        <button
          onClick={increment}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1.25rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => incrementAsync(5)}
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '加载中...' : '异步 +5'}
        </button>
        <button
          onClick={() => incrementAsync(-1, 500)}
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            backgroundColor: '#fca5a5',
          }}
        >
          触发错误
        </button>
      </div>

      <button
        onClick={reset}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        重置
      </button>

      <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
        💡 状态已持久化到 localStorage，刷新页面后 count 会恢复。
        <br />
        打开 Redux DevTools 可查看状态变更。
      </p>
    </div>
  )
}

export default Counter
