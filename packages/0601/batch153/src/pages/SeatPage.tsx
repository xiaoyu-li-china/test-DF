import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import SeatCanvas from '../components/SeatCanvas';
import SeatLegend from '../components/SeatLegend';
import TicketCountSelector from '../components/TicketCountSelector';
import OrderBar from '../components/OrderBar';
import CountdownTimer from '../components/CountdownTimer';
import ToastContainer from '../components/ToastContainer';
import RefundModal from '../components/RefundModal';
import { useSeatStore } from '../store/useSeatStore';
import { api } from '../api/mockApi';
import { formatDateDisplay } from '../utils/seatUtils';

export default function SeatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    session,
    movie,
    seatLayout,
    loading,
    error,
    fetchSeatLayout,
    setSession,
    setMovie,
    isLocked,
  } = useSeatStore();

  useEffect(() => {
    if (sessionId) {
      loadSessionData(sessionId);
    }

    return () => {
      if (!isLocked) {
        // 清理未锁定的选择
      }
    };
  }, [sessionId]);

  const loadSessionData = async (id: string) => {
    try {
      const sessionData = await api.getSessionById(id);
      if (!sessionData) {
        navigate('/');
        return;
      }
      setSession(sessionData);

      const movieData = await api.getMovieById(sessionData.movieId);
      if (movieData) {
        setMovie(movieData);
      }

      await fetchSeatLayout(id);
    } catch (err) {
      console.error('Failed to load session data:', err);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading && !seatLayout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">加载座位图中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">加载失败</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-400 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      <CountdownTimer />
      <ToastContainer />
      <RefundModal />

      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {movie && (
              <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {movie && (
                <h1
                  className="text-xl font-bold text-white truncate"
                  style={{ fontFamily: '"Noto Serif SC", serif' }}
                >
                  {movie.title}
                </h1>
              )}
              {session && (
                <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDateDisplay(session.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {session.hall}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {session.language}
                  </span>
                  <span className="text-yellow-400 font-bold">¥{session.price}/张</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {!isLocked && <TicketCountSelector />}

        {seatLayout && (
          <div className="bg-gray-800/30 rounded-2xl p-4 mb-4">
            <SeatCanvas layout={seatLayout} />
          </div>
        )}

        <SeatLegend />
      </div>

      <OrderBar />
    </div>
  );
}
