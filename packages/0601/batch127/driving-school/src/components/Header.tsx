import { Car, ChevronLeft, ChevronRight, Calendar, Download, Users } from 'lucide-react';

interface HeaderProps {
  weekRangeStr: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onExport: () => void;
  onOpenInstructors: () => void;
}

export function Header({
  weekRangeStr,
  onPrevWeek,
  onNextWeek,
  onExport,
  onOpenInstructors,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">驾校智能排课系统</h1>
              <p className="text-sm text-gray-500">高效管理学员预约与教练排班</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={onPrevWeek}
                className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700">{weekRangeStr}</span>
              </div>
              <button
                onClick={onNextWeek}
                className="p-2 rounded-md hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenInstructors}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
              >
                <Users className="w-4 h-4" />
                <span>教练管理</span>
              </button>
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>导出下周排班</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
