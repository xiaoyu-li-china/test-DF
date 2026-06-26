import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Session } from '../types';
import { formatDateDisplay } from '../utils/seatUtils';
import { useSeatStore } from '../store/useSeatStore';

interface SessionListProps {
  sessions: Session[];
}

export default function SessionList({ sessions }: SessionListProps) {
  const navigate = useNavigate();
  const { setSession, setMovie } = useSeatStore();
  const [selectedDate, setSelectedDate] = useState<string>(sessions[0]?.date || '');

  const dates = useMemo(() => {
    const uniqueDates = [...new Set(sessions.map((s) => s.date))];
    return uniqueDates.sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  const scrollDates = (direction: 'left' | 'right') => {
    const currentIndex = dates.indexOf(selectedDate);
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(dates.length - 1, currentIndex + 1);
    if (newIndex !== currentIndex) {
      setSelectedDate(dates[newIndex]);
    }
  };

  const handleSelectSession = async (session: Session) => {
    const { api } = await import('../api/mockApi');
    const movie = await api.getMovieById(session.movieId);
    if (movie) {
      setMovie(movie);
    }
    setSession(session);
    navigate(`/seats/${session.id}`);
  };

  const isSessionPast = (session: Session) => {
    const now = new Date();
    const [hours, minutes] = session.time.split(':').map(Number);
    const sessionDate = new Date(session.date);
    sessionDate.setHours(hours, minutes, 0, 0);
    return sessionDate < now;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yellow-400" />
          选择日期
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollDates('left')}
            disabled={dates.indexOf(selectedDate) === 0}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollDates('right')}
            disabled={dates.indexOf(selectedDate) === dates.length - 1}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`
              px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all duration-300
              ${selectedDate === date
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            {formatDateDisplay(date)}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-400" />
          选择场次
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => {
            const isPast = isSessionPast(session);
            return (
              <button
                key={session.id}
                onClick={() => !isPast && handleSelectSession(session)}
                disabled={isPast}
                className={`
                  p-5 rounded-2xl text-left transition-all duration-300 group
                  ${isPast
                    ? 'bg-gray-800/30 opacity-50 cursor-not-allowed'
                    : 'bg-gray-800/70 hover:bg-gray-800 hover:scale-[1.02] hover:shadow-xl cursor-pointer border border-gray-700 hover:border-yellow-500/50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                    {session.time}
                  </div>
                  <div className="text-yellow-400 font-bold text-xl">
                    ¥{session.price}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{session.hall}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs">
                      {session.language}
                    </span>
                    {isPast && (
                      <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-400 text-xs">
                        已结束
                      </span>
                    )}
                  </div>
                </div>
                {!isPast && (
                  <div className="mt-4 text-center text-yellow-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    点击选座 →
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
