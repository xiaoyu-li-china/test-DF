import { useState, useEffect } from 'react';
import { Film, Loader2, Ticket, RotateCcw } from 'lucide-react';
import MovieCard from '../components/MovieCard';
import SessionList from '../components/SessionList';
import ToastContainer from '../components/ToastContainer';
import RefundModal from '../components/RefundModal';
import { api } from '../api/mockApi';
import type { Movie, Session } from '../types';
import { useSeatStore } from '../store/useSeatStore';
import { getAllSessions } from '../mock/data';

export default function SessionPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const { resetAll, lockedOrders, loadLockedOrders, requestRefund, getRefundPolicy } = useSeatStore();

  useEffect(() => {
    resetAll();
    loadLockedOrders();
    loadMovies();
  }, [resetAll, loadLockedOrders]);

  const loadMovies = async () => {
    setLoading(true);
    try {
      const movieData = await api.getMovies();
      setMovies(movieData);
      if (movieData.length > 0) {
        setSelectedMovie(movieData[0]);
        const sessionData = await api.getSessionsByMovie(movieData[0].id);
        setSessions(sessionData);
      }
    } catch (error) {
      console.error('Failed to load movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = async (movie: Movie) => {
    setSelectedMovie(movie);
    setLoading(true);
    try {
      const sessionData = await api.getSessionsByMovie(movie.id);
      setSessions(sessionData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && movies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <ToastContainer />
      <RefundModal />

      <div className="relative h-48 overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 via-gray-900 to-gray-900" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 bg-yellow-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-48 h-48 bg-red-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 h-full flex items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-2xl">
              <Film className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                在线选座购票
              </h1>
              <p className="text-gray-400">选择电影和场次，享受便捷的观影体验</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {lockedOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-red-400 rounded-full" />
              我的订单
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedOrders.map((order) => {
                const session = getAllSessions().find((s) => s.id === order.sessionId);
                const policy = getRefundPolicy(order);
                const remaining = order.expireAt - Date.now();
                const minutes = Math.max(0, Math.floor(remaining / 60000));

                return (
                  <div
                    key={order.orderId}
                    className="bg-gray-800/70 rounded-2xl p-5 border border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-bold">{session?.hall || '未知影厅'}</div>
                        <div className="text-sm text-gray-400">
                          {session ? `${session.date} ${session.time}` : ''} · {session?.language}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold text-lg">¥{order.totalPrice}</div>
                        <div className="text-xs text-gray-500">{order.seatIds.length}张票</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-gray-400">
                          {remaining > 0 ? `锁座剩余 ${minutes} 分钟` : '已过期'}
                        </span>
                      </div>

                      {policy.canRefund && (
                        <button
                          onClick={() => requestRefund(order.orderId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
                            bg-red-900/50 text-red-300 border border-red-800/50
                            hover:bg-red-900/70 hover:text-red-200
                            transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          退票
                        </button>
                      )}

                      {!policy.canRefund && remaining > 0 && (
                        <span className="text-xs text-gray-500">{policy.reason}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-8 bg-yellow-400 rounded-full" />
            正在热映
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isSelected={selectedMovie?.id === movie.id}
                onClick={() => handleSelectMovie(movie)}
              />
            ))}
          </div>
        </section>

        {selectedMovie && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-yellow-400 rounded-full" />
              <span style={{ fontFamily: '"Noto Serif SC", serif' }}>{selectedMovie.title}</span>
              <span className="text-lg text-gray-400 font-normal">· 选择场次</span>
            </h2>
            <SessionList sessions={sessions} />
          </section>
        )}
      </div>
    </div>
  );
}
