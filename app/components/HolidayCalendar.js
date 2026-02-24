'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  X, 
  Sun,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getHolidays,
  addHoliday,
  deleteHoliday
} from '../lib/firebaseDB';

// 日本の祝日データ (2024-2026) - Golden Week含む
const JAPANESE_NATIONAL_HOLIDAYS = {
  2024: [
    { date: '2024-01-01', name: '元日', type: 'national' },
    { date: '2024-01-08', name: '成人の日', type: 'national' },
    { date: '2024-02-11', name: '建国記念の日', type: 'national' },
    { date: '2024-02-12', name: '振替休日', type: 'substitute' },
    { date: '2024-02-23', name: '天皇誕生日', type: 'national' },
    { date: '2024-03-20', name: '春分の日', type: 'national' },
    { date: '2024-04-29', name: '昭和の日', type: 'national' },
    // Golden Week
    { date: '2024-05-03', name: '憲法記念日', type: 'national' },
    { date: '2024-05-04', name: 'みどりの日', type: 'national' },
    { date: '2024-05-05', name: 'こどもの日', type: 'national' },
    { date: '2024-05-06', name: '振替休日', type: 'substitute' },
    { date: '2024-07-15', name: '海の日', type: 'national' },
    { date: '2024-08-11', name: '山の日', type: 'national' },
    { date: '2024-08-12', name: '振替休日', type: 'substitute' },
    // お盆休み (会社によって異なるため、ここでは入れない)
    { date: '2024-09-16', name: '敬老の日', type: 'national' },
    { date: '2024-09-22', name: '秋分の日', type: 'national' },
    { date: '2024-09-23', name: '振替休日', type: 'substitute' },
    { date: '2024-10-14', name: '体育の日', type: 'national' },
    { date: '2024-11-03', name: '文化の日', type: 'national' },
    { date: '2024-11-04', name: '振替休日', type: 'substitute' },
    { date: '2024-11-23', name: '勤労感謝の日', type: 'national' },
    // 年末年始 (会社によって異なるため、ここでは入れない)
  ],
  2025: [
    { date: '2025-01-01', name: '元日', type: 'national' },
    { date: '2025-01-13', name: '成人の日', type: 'national' },
    { date: '2025-02-11', name: '建国記念の日', type: 'national' },
    { date: '2025-02-23', name: '天皇誕生日', type: 'national' },
    { date: '2025-02-24', name: '振替休日', type: 'substitute' },
    { date: '2025-03-20', name: '春分の日', type: 'national' },
    { date: '2025-04-29', name: '昭和の日', type: 'national' },
    // Golden Week
    { date: '2025-05-03', name: '憲法記念日', type: 'national' },
    { date: '2025-05-04', name: 'みどりの日', type: 'national' },
    { date: '2025-05-05', name: 'こどもの日', type: 'national' },
    { date: '2025-05-06', name: '振替休日', type: 'substitute' },
    { date: '2025-07-21', name: '海の日', type: 'national' },
    { date: '2025-08-11', name: '山の日', type: 'national' },
    { date: '2025-09-15', name: '敬老の日', type: 'national' },
    { date: '2025-09-23', name: '秋分の日', type: 'national' },
    { date: '2025-10-13', name: '体育の日', type: 'national' },
    { date: '2025-11-03', name: '文化の日', type: 'national' },
    { date: '2025-11-23', name: '勤労感謝の日', type: 'national' },
    { date: '2025-11-24', name: '振替休日', type: 'substitute' },
  ],
  2026: [
    { date: '2026-01-01', name: '元日', type: 'national' },
    { date: '2026-01-12', name: '成人の日', type: 'national' },
    { date: '2026-02-11', name: '建国記念の日', type: 'national' },
    { date: '2026-02-23', name: '天皇誕生日', type: 'national' },
    { date: '2026-03-20', name: '春分の日', type: 'national' },
    { date: '2026-04-29', name: '昭和の日', type: 'national' },
    // Golden Week
    { date: '2026-05-03', name: '憲法記念日', type: 'national' },
    { date: '2026-05-04', name: 'みどりの日', type: 'national' },
    { date: '2026-05-05', name: 'こどもの日', type: 'national' },
    { date: '2026-05-06', name: '振替休日', type: 'substitute' },
    { date: '2026-07-20', name: '海の日', type: 'national' },
    { date: '2026-08-11', name: '山の日', type: 'national' },
    { date: '2026-09-21', name: '敬老の日', type: 'national' },
    { date: '2026-09-22', name: '国民の休日', type: 'national' },
    { date: '2026-09-23', name: '秋分の日', type: 'national' },
    { date: '2026-10-12', name: '体育の日', type: 'national' },
    { date: '2026-11-03', name: '文化の日', type: 'national' },
    { date: '2026-11-23', name: '勤労感謝の日', type: 'national' },
  ]
};

// 会社の典型的な休日 (お盆休み、年末年始など) - 例として2026年
const TYPICAL_COMPANY_HOLIDAYS_2026 = [
  // 年末年始
  { date: '2026-12-29', name: '年末休暇', type: 'company' },
  { date: '2026-12-30', name: '年末休暇', type: 'company' },
  { date: '2026-12-31', name: '年末休暇', type: 'company' },
  // お盆休み
  { date: '2026-08-13', name: 'お盆休み', type: 'company' },
  { date: '2026-08-14', name: 'お盆休み', type: 'company' },
  { date: '2026-08-15', name: 'お盆休み', type: 'company' },
];

export default function HolidayCalendar({ user, showNotification }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'company',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getHolidays();
      if (result.success) {
        const companyHolidays = result.data.filter(h => {
          const year = new Date(h.date).getFullYear();
          return year === selectedYear;
        });

        const nationalHolidays = JAPANESE_NATIONAL_HOLIDAYS[selectedYear] || [];
        const allHolidays = [...companyHolidays, ...nationalHolidays];
        
        // 2026年の場合、典型的な会社休日も追加
        if (selectedYear === 2026) {
          allHolidays.push(...TYPICAL_COMPANY_HOLIDAYS_2026);
        }
        
        allHolidays.sort((a, b) => a.date.localeCompare(b.date));
        
        setHolidays(allHolidays);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      showNotification('データの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const holidayData = {
      date: formData.date,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      year: new Date(formData.date).getFullYear(),
      createdBy: user.email
    };

    const result = await addHoliday(holidayData);

    if (result.success) {
      showNotification('休日を追加しました', 'success');
      setShowAddModal(false);
      resetForm();
      loadData();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('この休日を削除しますか?')) return;

    const result = await deleteHoliday(id);
    if (result.success) {
      showNotification('休日を削除しました', 'success');
      loadData();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      name: '',
      type: 'company',
      description: ''
    });
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'national': return '国民の祝日';
      case 'company': return '会社休日';
      case 'substitute': return '振替休日';
      default: return type;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'national': return <Sun className="text-red-600" size={18} />;
      case 'company': return <Building2 className="text-blue-600" size={18} />;
      case 'substitute': return <Calendar className="text-orange-600" size={18} />;
      default: return <Calendar className="text-gray-600" size={18} />;
    }
  };

  const filteredHolidays = holidays.filter(holiday => {
    if (filterType !== 'all' && holiday.type !== filterType) return false;
    return true;
  });

  const getCalendarDays = () => {
    const year = selectedYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = holidays.find(h => h.date === dateStr);
      const dayOfWeek = new Date(year, month, day).getDay();
      days.push({ day, date: dateStr, holiday, dayOfWeek });
    }
    
    return days;
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const stats = {
    total: filteredHolidays.length,
    national: filteredHolidays.filter(h => h.type === 'national').length,
    company: filteredHolidays.filter(h => h.type === 'company').length,
    substitute: filteredHolidays.filter(h => h.type === 'substitute').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Calendar className="animate-spin text-red-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">祝日カレンダー</h1>
            <p className="text-gray-600">国民の祝日と会社休日を管理</p>
          </div>
          {(user.role === 'admin' || user.role === 'hr') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              会社休日追加
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="text-red-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-700">総休日数</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}日</p>
            <p className="text-sm text-gray-500 mt-1">{selectedYear}年</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Sun className="text-red-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-700">国民の祝日</h3>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.national}日</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="text-blue-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-700">会社休日</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{stats.company}日</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="text-orange-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-700">振替休日</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600">{stats.substitute}日</p>
          </div>
        </div>

        {/* Simple Modern Calendar */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 p-6">
          {/* Calendar Header - Butonlar daha görünür */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                aria-label="前の月"
              >
                <ChevronLeft size={24} strokeWidth={3} />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 min-w-[180px] text-center">
                {selectedYear}年 {monthNames[currentMonth]}
              </h2>

              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                aria-label="次の月"
              >
                <ChevronRight size={24} strokeWidth={3} />
              </button>
            </div>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value={2024}>2024年</option>
              <option value={2025}>2025年</option>
              <option value={2026}>2026年</option>
            </select>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-3">
            {/* 曜日ヘッダー */}
            {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
              <div
                key={day}
                className={`text-center font-bold py-2 text-sm ${
                  idx === 0 ? 'text-red-600' : 
                  idx === 6 ? 'text-blue-600' : 
                  'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}

            {/* カレンダーの日付 */}
            {getCalendarDays().map((dayData, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] border rounded-lg p-3 transition-all ${
                  dayData === null
                    ? 'bg-gray-50 border-gray-200'
                    : dayData.holiday
                    ? 'bg-red-500 text-white border-red-600 shadow-md'
                    : dayData.dayOfWeek === 0
                    ? 'bg-red-50 border-red-200 hover:bg-red-100'
                    : dayData.dayOfWeek === 6
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {dayData && (
                  <div className="h-full flex flex-col">
                    <div className={`text-xl font-bold mb-2 ${
                      dayData.holiday ? 'text-white' :
                      dayData.dayOfWeek === 0 ? 'text-red-600' :
                      dayData.dayOfWeek === 6 ? 'text-blue-600' :
                      'text-gray-900'
                    }`}>
                      {dayData.day}
                    </div>
                    {dayData.holiday && (
                      <div className="text-xs font-semibold text-white leading-tight">
                        {dayData.holiday.name}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="text-gray-600" size={20} />
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value="all">全ての休日</option>
              <option value="national">国民の祝日</option>
              <option value="company">会社休日</option>
              <option value="substitute">振替休日</option>
            </select>
          </div>
        </div>

        {/* Holiday List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">日付</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">休日名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">種類</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">備考</th>
                  {(user.role === 'admin' || user.role === 'hr') && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">アクション</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHolidays.map((holiday, index) => (
                  <tr key={holiday.id || `holiday-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{holiday.date}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{holiday.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(holiday.type)}
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          holiday.type === 'national' ? 'bg-red-100 text-red-700' :
                          holiday.type === 'company' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {getTypeLabel(holiday.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {holiday.description || '-'}
                    </td>
                    {(user.role === 'admin' || user.role === 'hr') && (
                      <td className="px-6 py-4">
                        {holiday.type === 'company' && holiday.id && (
                          <button
                            onClick={() => handleDelete(holiday.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHolidays.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                休日が見つかりません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">会社休日追加</h2>
              <p className="text-sm text-gray-600 mt-1">
                例: 年末年始休暇、お盆休み、創立記念日など
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  日付 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  休日名 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 年末年始休暇、お盆休み"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  備考
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="追加情報があれば入力してください"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-base font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-base font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}