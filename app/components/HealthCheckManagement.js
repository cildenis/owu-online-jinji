'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Check, 
  X, 
  Calendar,
  FileText,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import {
  getHealthChecks,
  addHealthCheck,
  updateHealthCheck,
  deleteHealthCheck,
  getEmployees
} from '../lib/firebaseDB';

export default function HealthCheckManagement({ user, showNotification }) {
  const [healthChecks, setHealthChecks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    scheduledDate: '',
    completedDate: '',
    status: 'scheduled', // scheduled, completed, pending, recheck_required
    reportSubmitted: false,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const empResult = await getEmployees();
      if (empResult.success) {
        setEmployees(empResult.data);
      }

      const result = await getHealthChecks();
      if (result.success) {
        // Seçili yıla göre filtrele
        const filtered = result.data.filter(hc => {
          const year = hc.scheduledDate ? new Date(hc.scheduledDate).getFullYear() : null;
          return year === selectedYear;
        });
        setHealthChecks(filtered);
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

    const healthCheckData = {
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      employeeEmail: formData.employeeEmail,
      scheduledDate: formData.scheduledDate,
      completedDate: formData.completedDate || null,
      status: formData.status,
      reportSubmitted: formData.reportSubmitted,
      notes: formData.notes,
      year: new Date(formData.scheduledDate).getFullYear()
    };

    const result = await addHealthCheck(healthCheckData);

    if (result.success) {
      showNotification('健康診断記録を追加しました', 'success');
      setShowAddModal(false);
      resetForm();
      loadData();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const result = await updateHealthCheck(id, { 
      status: newStatus,
      completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    });

    if (result.success) {
      showNotification('ステータスを更新しました', 'success');
      loadData();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('この記録を削除しますか?')) return;

    const result = await deleteHealthCheck(id);
    if (result.success) {
      showNotification('記録を削除しました', 'success');
      loadData();
    } else {
      showNotification('エラー: ' + result.error, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      employeeEmail: '',
      scheduledDate: '',
      completedDate: '',
      status: 'scheduled',
      reportSubmitted: false,
      notes: ''
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'recheck_required': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return '実施済み';
      case 'scheduled': return '予定';
      case 'pending': return '未実施';
      case 'recheck_required': return '再検査必要';
      default: return status;
    }
  };

  const stats = {
    total: healthChecks.length,
    completed: healthChecks.filter(h => h.status === 'completed').length,
    pending: healthChecks.filter(h => h.status === 'pending').length,
    recheckRequired: healthChecks.filter(h => h.status === 'recheck_required').length
  };

  const filteredHealthChecks = healthChecks.filter(hc => {
    if (filterStatus !== 'all' && hc.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="animate-spin text-pink-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">健康診断管理</h1>
            <p className="text-gray-600">従業員の健康診断スケジュールと実施状況を管理</p>
          </div>
          {(user.role === 'admin' || user.role === 'hr') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
            >
              <Plus size={20} />
              健康診断追加
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-pink-600" size={24} />
              <h3 className="font-semibold text-gray-700">総従業員数</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}名</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Check className="text-green-600" size={24} />
              <h3 className="font-semibold text-gray-700">実施済み</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completed}名</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="text-yellow-600" size={24} />
              <h3 className="font-semibold text-gray-700">未実施</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pending}名</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="text-orange-600" size={24} />
              <h3 className="font-semibold text-gray-700">再検査必要</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.recheckRequired}名</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Calendar className="text-gray-600" size={20} />
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
            >
              <option value={2024}>2024年度</option>
              <option value={2025}>2025年度</option>
              <option value={2026}>2026年度</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
            >
              <option value="all">全てのステータス</option>
              <option value="scheduled">予定</option>
              <option value="completed">実施済み</option>
              <option value="pending">未実施</option>
              <option value="recheck_required">再検査必要</option>
            </select>
          </div>
        </div>

        {/* Health Checks Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">従業員名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">予定日</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">実施日</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ステータス</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">診断書提出</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">メモ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHealthChecks.map((hc) => (
                  <tr key={hc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{hc.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{hc.scheduledDate || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{hc.completedDate || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(hc.status)}`}>
                        {getStatusLabel(hc.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {hc.reportSubmitted ? (
                        <span className="text-green-600 font-medium">提出済み</span>
                      ) : (
                        <span className="text-gray-400">未提出</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {hc.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {(user.role === 'admin' || user.role === 'hr') && (
                        <div className="flex items-center gap-2">
                          {hc.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusUpdate(hc.id, 'completed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="実施済みにする"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(hc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="削除"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHealthChecks.length === 0 && (
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
              <h2 className="text-2xl font-bold text-gray-900">健康診断記録追加</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  従業員 *
                </label>
                <select
                  required
                  value={formData.employeeEmail}
                  onChange={handleEmployeeSelect}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white"
                >
                  <option value="">選択してください</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.email}>
                      {emp.fullName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  予定日 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ステータス *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white"
                >
                  <option value="scheduled">予定</option>
                  <option value="completed">実施済み</option>
                  <option value="pending">未実施</option>
                  <option value="recheck_required">再検査必要</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  メモ
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-base text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none"
                  placeholder="管理用メモ（従業員には見えません）"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  className="px-6 py-3 text-base font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
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