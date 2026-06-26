import { Clock, Star, ChevronRight } from 'lucide-react';
import type { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  isSelected: boolean;
  onClick: () => void;
}

export default function MovieCard({ movie, isSelected, onClick }: MovieCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl cursor-pointer
        transition-all duration-500 transform
        ${isSelected
          ? 'ring-2 ring-yellow-500 scale-[1.02] shadow-2xl shadow-yellow-500/20'
          : 'hover:scale-[1.02] hover:shadow-2xl'
        }
      `}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />

        <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-500 rounded-full flex items-center gap-1">
          <Star className="w-4 h-4 text-gray-900 fill-gray-900" />
          <span className="text-sm font-bold text-gray-900">{movie.rating}</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            {movie.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {movie.duration}分钟
            </span>
            <span>{movie.genre}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-800/50">
        <p className="text-sm text-gray-400 line-clamp-2">{movie.description}</p>
        <div className="mt-3 flex items-center justify-end text-yellow-400">
          <span className="text-sm font-medium">选择场次</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}
