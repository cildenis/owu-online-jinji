'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Check, 
  X, 
  Calendar,
  TrendingUp,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  getOvertimeRecords,
  addOvertimeRecord,
  updateOvertimeRecord,
  deleteOvertimeRecord,
  getUserOvertimeRecords,
  getOvertimeStats,
  getEmployees
} from '../lib/firebaseDB';

export default function OvertimeManagement({ user, showNotification }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    date: '',
    startTime: '',
    endTime: '',
    overtimeType: 'weekday',
    reason: '',
    compensation: 'pay'
  });

  useEffect(() => {
    loadData();
  }, [user, selectedMonth]);

  useEffect(() => {
    if (user?.email) {
      loadStats();
    }
  }, [selectedMonth, user, records]); // ✅ records eklendi - data değişince stats güncellenir

  const loadData = async () => {
    setLoading(true);
    try {
      const empResult = await getEmployees();
      if (empResult.success) {
        setEmployees(empResult.data);
      }

      let result;
      if (user.role === 'admin' || user.role === 'hr') {
        result = await getOvertimeRecords();
      } else {
        result = await getUserOvertimeRecords(user.email, selectedMonth);
      }

      if (result.success) {
        setRecords(result.data);
        console.log('📊 Yüklenen kayıt sayısı:', result.data.length);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      showNotification('データの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    console.log('🔍 loadStats çağrıldı');
    console.log('👤 User:', user);
    console.log('📧 User Email:', user?.email);
    console.log('🔑 User Role:', user?.role);
    
    if (!user?.email) {
      console.log('❌ User email yok!');
      return;
    }

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-31`;

    console.log('📅 Tarih aralığı:', { startDate, endDate, selectedMonth });

    let allRecords = [];

    // ✅ Admin veya HR ise TÜM kayıtları al
    if (user.role === 'admin' || user.role === 'hr') {
      const result = await getOvertimeRecords();
      if (result.success) {
        // Sadece seçili ay içindeki kayıtları filtrele
        allRecords = result.data.filter(record => {
          const inDateRange = record.date >= startDate && record.date <= endDate;
          return inDateRange;
        });
        console.log('👥 Admin - Filtrelenmiş kayıtlar:', allRecords.length);
        console.log('📋 Kayıtlar:', allRecords);
      }
    } else {
      // Normal kullanıcı için sadece kendi kayıtları
      const result = await getOvertimeStats(user.email, startDate, endDate);
      if (result.success) {
        allRecords = result.data.records;
        console.log('👤 Normal kullanıcı kayıtları:', allRecords.length);
      }
    }

    // 統計計算
    const totalHours = allRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
    const weekdayHours = allRecords.filter(r => r.overtimeType === 'weekday').reduce((sum, r) => sum + (r.hours || 0), 0);
    const weekendHours = allRecords.filter(r => r.overtimeType === 'weekend').reduce((sum, r) => sum + (r.hours || 0), 0);
    const holidayHours = allRecords.filter(r => r.overtimeType === 'holiday').reduce((sum, r) => sum + (r.hours || 0), 0);

    const calculatedStats = {
      totalHours,
      weekdayHours,
      weekendHours,
      holidayHours,
      totalRecords: allRecords.length
    };

    console.log('📊 Hesaplanan stats:', calculatedStats);
    setStats(calculatedStats);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Saat hesaplama
    const start = new Date(`2000-01-01 ${formData.startTime}`);
    const end = new Date(`2000-01-01 ${formData.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);

    if (hours <= 0) {
      showNotification('終了時間は開始時間より後でなければなりません', 'error');
      return;
    }

    const overtimeData = {
      employeeId: formData.employeeId || user.uid,
      employeeName: formData.employeeName || user.fullName,
      employeeEmail: formData.employeeEmail || user.email,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours: parseFloat(hours.toFixed(2)),
      overtimeType: formData.overtimeType,
      reason: formData.reason,
      compensation: formData.compensation,
      status: 'pending'
    };

    console.log('📤 送信データ:', overtimeData);

    const result = await addOvertimeRecord(overtimeData);

    if (result.success) {
      showNotification('残業申請を送信しました', 'success');
      setShowAddModal(false);
      resetForm();
      loadData();
      loadStats();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleApprove = async (recordId) => {
    const result = await updateOvertimeRecord(recordId, {
      status: 'approved',
      approvedBy: user.email
    });

    if (result.success) {
      showNotification('残業申請を承認しました', 'success');
      loadData();
      loadStats();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleReject = async (recordId) => {
    const reason = prompt('却下理由を入力してください:');
    if (!reason) return;

    const result = await updateOvertimeRecord(recordId, {
      status: 'rejected',
      approvedBy: user.email,
      rejectionReason: reason
    });

    if (result.success) {
      showNotification('残業申請を却下しました', 'success');
      loadData();
      loadStats();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('この記録を削除しますか?')) return;

    const result = await deleteOvertimeRecord(recordId);
    if (result.success) {
      showNotification('記録を削除しました', 'success');
      loadData();
      loadStats();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      employeeEmail: '',
      date: '',
      startTime: '',
      endTime: '',
      overtimeType: 'weekday',
      reason: '',
      compensation: 'pay'
    });
  };

  const handleEmployeeSelect = (e) => {
    const selectedEmp = employees.find(emp => emp.email === e.target.value);
    if (selectedEmp) {
      setFormData({
        ...formData,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.fullName,
        employeeEmail: selectedEmp.email
      });
    }
  };

  const filteredRecords = records.filter(record => {
    if (filterStatus !== 'all' && record.status !== filterStatus) return false;
    if (filterType !== 'all' && record.overtimeType !== filterType) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'weekday': return '平日';
      case 'weekend': return '週末';
      case 'holiday': return '祝日';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">残業管理</h1>
            <p className="text-gray-600">残業申請と承認を管理</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            残業申請
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-blue-600" size={24} />
                <h3 className="font-semibold text-gray-700">総残業時間</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}時間</p>
              <p className="text-sm text-gray-500 mt-1">{selectedMonth}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-green-600" size={24} />
                <h3 className="font-semibold text-gray-700">平日残業</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.weekdayHours.toFixed(1)}時間</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-purple-600" size={24} />
                <h3 className="font-semibold text-gray-700">週末残業</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.weekendHours.toFixed(1)}時間</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="text-orange-600" size={24} />
                <h3 className="font-semibold text-gray-700">祝日残業</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.holidayHours.toFixed(1)}時間</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="text-gray-600" size={20} />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">全てのステータス</option>
              <option value="pending">承認待ち</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">全てのタイプ</option>
              <option value="weekday">平日</option>
              <option value="weekend">週末</option>
              <option value="holiday">祝日</option>
            </select>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">日付</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">従業員</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">時間</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">タイプ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">時間数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">理由</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ステータス</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{record.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.startTime} - {record.endTime}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getTypeLabel(record.overtimeType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {record.hours}h
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {record.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                        {record.status === 'approved' ? '承認済み' : 
                         record.status === 'rejected' ? '却下' : '承認待ち'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(user.role === 'admin' || user.role === 'hr') && record.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(record.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="承認"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(record.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="却下"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        {(user.email === record.employeeEmail || user.role === 'admin') && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            title="削除"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                記録が見つかりません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b bg-white sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-gray-900">残業申請</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {(user.role === 'admin' || user.role === 'hr') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    従業員 *
                  </label>
                  <select
                    required
                    value={formData.employeeEmail}
                    onChange={handleEmployeeSelect}
                    className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="" className="text-gray-500">選択してください</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.email} className="text-gray-900">
                        {emp.fullName} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  日付 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  style={{ 
                    colorScheme: 'light',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    開始時間 *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    style={{ 
                      colorScheme: 'light',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    終了時間 *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    style={{ 
                      colorScheme: 'light',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  残業タイプ *
                </label>
                <select
                  required
                  value={formData.overtimeType}
                  onChange={(e) => setFormData({ ...formData, overtimeType: e.target.value })}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="weekday" className="text-gray-900">平日</option>
                  <option value="weekend" className="text-gray-900">週末</option>
                  <option value="holiday" className="text-gray-900">祝日</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  補償方法 *
                </label>
                <select
                  required
                  value={formData.compensation}
                  onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="pay" className="text-gray-900">残業代</option>
                  <option value="time-off" className="text-gray-900">代休</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  理由 *
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="残業の理由を入力してください"
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t bg-white sticky bottom-0 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-base font-semibold text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-base font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  申請する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}