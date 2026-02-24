'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, Filter, User, FileText, Lock, Loader } from 'lucide-react';
import { getLeaveRequests, addLeaveRequest, updateLeaveRequest } from '../lib/firebaseDB';

export default function LeaveManagement({ user, showNotification }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeId: '',
    employeeEmail: '',
    leaveType: '年次休暇',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // User kontrolü
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Lock className="mx-auto text-gray-300 mb-4" size={60} />
          <p className="text-gray-500 text-lg">ログインが必要です</p>
        </div>
      </div>
    );
  }

  // Firebase'den verileri yükle
  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    setIsLoading(true);
    console.log('休暇申請を読み込んでいます...');
    
    const result = await getLeaveRequests();
    
    if (result.success) {
      console.log('休暇申請がロードされました:', result.data);
      setLeaveRequests(result.data);
    } else {
      console.error('読み込みエラー:', result.error);
      if (showNotification) {
        showNotification('休暇申請の読み込みに失敗しました', 'error');
      }
    }
    
    setIsLoading(false);
  };

  // ROL BAZLI FİLTRELEME
  const getVisibleRequests = () => {
    if (user.role === 'admin') {
      return leaveRequests;
    } else if (user.role === 'employee') {
      return leaveRequests.filter(req => req.employeeEmail === user.email);
    }
    return [];
  };

  const visibleRequests = getVisibleRequests();

  // 休暇統計 - Dinamik hesaplama
  const leaveStats = {
    totalLeave: 14,
    usedLeave: leaveRequests
      .filter(req => req.employeeEmail === user.email && req.status === 'approved')
      .reduce((sum, req) => sum + req.days, 0),
    get remainingLeave() {
      return this.totalLeave - this.usedLeave;
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmitRequest = async () => {
    if (!formData.employeeName || !formData.startDate || !formData.endDate || !formData.reason) {
      if (showNotification) {
        showNotification('すべての項目を入力してください', 'error');
      } else {
        alert('すべての項目を入力してください');
      }
      return;
    }

    setIsSubmitting(true);

    const days = calculateDays(formData.startDate, formData.endDate);
    
    const newRequest = {
      employeeName: formData.employeeName,
      employeeId: formData.employeeId || user.employeeId || '',
      employeeEmail: formData.employeeEmail || user.email,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: days,
      reason: formData.reason,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0],
      approvedBy: null,
      rejectionReason: null
    };

    console.log('新しい休暇申請を送信しています:', newRequest);

    const result = await addLeaveRequest(newRequest);

    if (result.success) {
      console.log('休暇申請が保存されました:', result.id);
      
      // Verileri yeniden yükle
      await loadLeaveRequests();
      
      setShowRequestModal(false);
      resetForm();
      
      if (showNotification) {
        showNotification('休暇申請が送信されました！', 'success');
      } else {
        alert('休暇申請が送信されました！');
      }
    } else {
      console.error('保存エラー:', result.error);
      if (showNotification) {
        showNotification('エラーが発生しました: ' + result.error, 'error');
      }
    }

    setIsSubmitting(false);
  };

  const handleApprove = async (id) => {
    const result = await updateLeaveRequest(id, {
      status: 'approved',
      approvedBy: user.name || user.fullName
    });

    if (result.success) {
      // Verileri yeniden yükle
      await loadLeaveRequests();
      setSelectedRequest(null);
      
      if (showNotification) {
        showNotification('休暇申請が承認されました！', 'success');
      } else {
        alert('休暇申請が承認されました！');
      }
    } else {
      if (showNotification) {
        showNotification('エラーが発生しました: ' + result.error, 'error');
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('却下理由を入力してください：');
    if (reason) {
      const result = await updateLeaveRequest(id, {
        status: 'rejected',
        rejectionReason: reason
      });

      if (result.success) {
        // Verileri yeniden yükle
        await loadLeaveRequests();
        setSelectedRequest(null);
        
        if (showNotification) {
          showNotification('休暇申請が却下されました。', 'error');
        } else {
          alert('休暇申請が却下されました。');
        }
      } else {
        if (showNotification) {
          showNotification('エラーが発生しました: ' + result.error, 'error');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeName: '',
      employeeId: '',
      employeeEmail: '',
      leaveType: '年次休暇',
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const filteredRequests = filterStatus === 'all' 
    ? visibleRequests 
    : visibleRequests.filter(req => req.status === filterStatus);

  const pendingCount = visibleRequests.filter(r => r.status === 'pending').length;
  const approvedCount = visibleRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = visibleRequests.filter(r => r.status === 'rejected').length;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-green-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">休暇管理</h1>
            <p className="text-gray-600">
              {user.role === 'admin' ? '全従業員の休暇申請を表示・管理' : 'あなたの休暇申請を表示・管理'}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowRequestModal(true);
            }}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            新規休暇申請
          </button>
        </div>

        {/* 統計カード */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">保留中</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">承認済み</p>
                <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">却下済み</p>
                <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">残り休暇</p>
                <p className="text-3xl font-bold text-blue-600">{leaveStats.remainingLeave}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 休暇権利カード - Sadece çalışanlar için */}
        {user.role === 'employee' && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">あなたの休暇権利</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-blue-100 text-sm mb-1">年間休暇日数</p>
                <p className="text-3xl font-bold">{leaveStats.totalLeave} 日</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">使用済み休暇</p>
                <p className="text-3xl font-bold">{leaveStats.usedLeave} 日</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">残り休暇</p>
                <p className="text-3xl font-bold">{leaveStats.remainingLeave} 日</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-white bg-opacity-20 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all"
                  style={{ width: `${(leaveStats.usedLeave / leaveStats.totalLeave) * 100}%` }}
                />
              </div>
              <p className="text-sm text-blue-100 mt-2">
                {Math.round((leaveStats.usedLeave / leaveStats.totalLeave) * 100)}% 使用済み
              </p>
            </div>
          </div>
        )}

        {/* フィルターボタン */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            すべて ({visibleRequests.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'pending' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            保留中 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'approved' 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            承認済み ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'rejected' 
                ? 'bg-red-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            却下済み ({rejectedCount})
          </button>
        </div>

        {/* 休暇申請リスト */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {user.role === 'admin' ? '全従業員の休暇申請' : 'あなたの休暇申請'}
            </h2>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Calendar className="mx-auto mb-4 text-gray-300" size={60} />
              <p className="text-lg">休暇申請はまだありません</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{request.employeeName}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(request.requestDate).toLocaleDateString('ja-JP')} に申請
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 ml-13">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">休暇種類</p>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {request.leaveType}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">期間</p>
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Calendar size={14} />
                            {new Date(request.startDate).toLocaleDateString('ja-JP')} - {new Date(request.endDate).toLocaleDateString('ja-JP')}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">日数</p>
                          <p className="text-sm font-bold text-gray-900">{request.days} 日</p>
                        </div>
                      </div>

                      <div className="ml-13 mt-3">
                        <p className="text-sm text-gray-600 mb-1">理由</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>

                      {request.rejectionReason && (
                        <div className="ml-13 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>却下理由:</strong> {request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'pending' ? '保留中' :
                         request.status === 'approved' ? '承認済み' :
                         '却下済み'}
                      </span>

                      {/* SADECE ADMIN ONAYLA/REDDET BUTONLARINI GÖREBİLİR */}
                      {user.role === 'admin' && request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(request.id);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                          >
                            承認
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(request.id);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                          >
                            却下
                          </button>
                        </div>
                      )}

                      {request.approvedBy && (
                        <p className="text-sm text-gray-500">
                          {request.approvedBy} により承認
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 申請モーダル */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">新規休暇申請</h2>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  従業員名 *
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({...formData, employeeName: e.target.value})}
                  placeholder="従業員名を入力してください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休暇種類 *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                >
                  <option value="年次休暇">年次休暇</option>
                  <option value="特別休暇">特別休暇</option>
                  <option value="病気休暇">病気休暇</option>
                  <option value="出産休暇">出産休暇</option>
                  <option value="育児休暇">育児休暇</option>
                  <option value="結婚休暇">結婚休暇</option>
                  <option value="忌引休暇">忌引休暇</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始日 *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了日 *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    休暇期間: {calculateDays(formData.startDate, formData.endDate)} 日
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休暇理由 / 説明 *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="休暇申請の理由を記入してください..."
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      送信中...
                    </>
                  ) : (
                    '申請を送信'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">休暇申請詳細</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">ステータス</p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium mt-1 ${
                    selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    selectedRequest.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedRequest.status === 'pending' ? '保留中' :
                     selectedRequest.status === 'approved' ? '承認済み' :
                     '却下済み'}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">従業員</p>
                  <p className="font-medium text-gray-900">{selectedRequest.employeeName}</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">休暇種類</p>
                  <p className="font-medium text-gray-900">{selectedRequest.leaveType}</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">開始日</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedRequest.startDate).toLocaleDateString('ja-JP')}
                  </p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">終了日</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedRequest.endDate).toLocaleDateString('ja-JP')}
                  </p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">日数</p>
                  <p className="font-medium text-gray-900">{selectedRequest.days} 日</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">申請日</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedRequest.requestDate).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">理由 / 説明</p>
                <p className="text-gray-900">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 mb-1">却下理由</p>
                  <p className="text-red-800">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}