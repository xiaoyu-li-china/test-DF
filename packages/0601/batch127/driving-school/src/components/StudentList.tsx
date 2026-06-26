import type { Student } from '../types';
import { Search, User, Phone, Star, AlertTriangle } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelect: (s: Student) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function StudentList({
  students,
  selectedStudent,
  onSelect,
  searchQuery,
  onSearchChange,
}: StudentListProps) {
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索学员姓名或电话..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="p-3 max-h-[600px] overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>暂无匹配的学员</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => onSelect(student)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedStudent?.id === student.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {student.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            student.subject === '科目二'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {student.subject}
                        </span>
                        {student.isRestricted && (
                          <div
                            className="group relative"
                            title="爽约3次以上，预约受限"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              爽约3次以上，预约受限
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{student.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {student.preferredInstructorId && (
                      <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                        <span className="text-xs">指定教练</span>
                      </div>
                    )}
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.noShowCount >= 3
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      爽约 {student.noShowCount} 次
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
