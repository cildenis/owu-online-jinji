'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  X, 
  AlertCircle,
  Send,
  Loader,
  User,
  ArrowRight,
  MessageSquare,
  Calendar,
  DollarSign,
  Paperclip,
  Stamp
} from 'lucide-react';
import { 
  getRingiDocuments, 
  createRingi, 
  approveOrRejectRingi, 
  cancelRingi,
  getPendingRingiForApprover
} from '../lib/firebaseDB';

export default function RingiSystem({ user, showNotification }) {
  const [ringis, setRingis] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRingi, setSelectedRingi] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    title: '',
    category: '経費申請',
    purpose: '',
    details: '',
    amount: '',
    urgency: 'normal',
    approvers: []
  });

  const [approverInput, setApproverInput] = useState({
    name: '',
    email: '',
    position: ''
  });

  // 稟議カテゴリー
  const categories = [
    '経費申請', // Expense Request
    '設備投資', // Capital Investment
    '人事異動', // Personnel Transfer
    '採用申請', // Recruitment Request
    '契約締結', // Contract Agreement
    '出張申請', // Business Trip
    '予算変更', // Budget Change
    '新規取引先', // New Business Partner
    'その他' // Other
  ];

  // 緊急度
  const urgencyLevels = [
    { value: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
    { value: 'normal', label: '通常', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: '緊急', color: 'bg-red-100 text-red-700' }
  ];

  useEffect(() => {
    loadRingis();
    loadPendingApprovals();
  }, []);

  const loadRingis = async () => {
    setIsLoading(true);
    const result = await getRingiDocuments();
    
    if (result.success) {
      // Filter based on user role
      let filteredRingis = result.data;
      
      if (user.role === 'employee') {
        // Show only user's own ringis
        filteredRingis = result.data.filter(r => r.requesterEmail === user.email);
      }
      
      setRingis(filteredRingis);
    } else {
      if (showNotification) {
        showNotification('稟議の読み込みに失敗しました', 'error');
      }
    }
    
    setIsLoading(false);
  };

  const loadPendingApprovals = async () => {
    const result = await getPendingRingiForApprover(user.email);
    
    if (result.success) {
      setPendingApprovals(result.data);
    }
  };

  const handleAddApprover = () => {
    if (!approverInput.name || !approverInput.email || !approverInput.position) {
      if (showNotification) {
        showNotification('承認者情報を入力してください', 'error');
      }
      return;
    }

    setFormData({
      ...formData,
      approvers: [
        ...formData.approvers,
        {
          name: approverInput.name,
          email: approverInput.email,
          position: approverInput.position,
          status: 'pending',
          approvedAt: null,
          comment: '',
          hanko: null
        }
      ]
    });

    setApproverInput({ name: '', email: '', position: '' });
  };

  const handleRemoveApprover = (index) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter((_, i) => i !== index)
    });
  };

  const handleCreateRingi = async () => {
    if (!formData.title || !formData.purpose || !formData.details || formData.approvers.length === 0) {
      if (showNotification) {
        showNotification('必須項目を入力してください', 'error');
      }
      return;
    }

    setIsSubmitting(true);

    const newRingi = {
      title: formData.title,
      category: formData.category,
      purpose: formData.purpose,
      details: formData.details,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      requester: user.name || user.fullName,
      requesterEmail: user.email,
      requestDate: new Date().toISOString().split('T')[0],
      approvalChain: formData.approvers,
      currentApprover: 0,
      urgency: formData.urgency,
      attachments: []
    };

    const result = await createRingi(newRingi);

    if (result.success) {
      await loadRingis();
      await loadPendingApprovals();
      setShowCreateModal(false);
      resetForm();
      
      if (showNotification) {
        showNotification('稟議を作成しました！', 'success');
      }
    } else {
      if (showNotification) {
        showNotification('エラーが発生しました: ' + result.error, 'error');
      }
    }

    setIsSubmitting(false);
  };

  const handleApproveReject = async (ringiId, approverIndex, decision) => {
    const comment = prompt(decision === 'approved' ? 'コメント（任意）:' : '却下理由を入力してください:');
    
    if (decision === 'rejected' && !comment) {
      if (showNotification) {
        showNotification('却下理由を入力してください', 'error');
      }
      return;
    }

    // Generate simple hanko data (in real app, use canvas or image)
    const hankoData = {
      approverName: user.name || user.fullName,
      timestamp: new Date().toISOString(),
      type: 'digital'
    };

    const result = await approveOrRejectRingi(ringiId, approverIndex, decision, comment || '', hankoData);

    if (result.success) {
      await loadRingis();
      await loadPendingApprovals();
      setSelectedRingi(null);
      
      if (showNotification) {
        showNotification(
          decision === 'approved' ? '稟議を承認しました！' : '稟議を却下しました',
          decision === 'approved' ? 'success' : 'error'
        );
      }
    } else {
      if (showNotification) {
        showNotification('エラーが発生しました: ' + result.error, 'error');
      }
    }
  };

  const handleCancelRingi = async (ringiId) => {
    const reason = prompt('キャンセル理由を入力してください:');
    
    if (!reason) return;

    const result = await cancelRingi(ringiId, reason);

    if (result.success) {
      await loadRingis();
      setSelectedRingi(null);
      
      if (showNotification) {
        showNotification('稟議をキャンセルしました', 'success');
      }
    } else {
      if (showNotification) {
        showNotification('エラー: ' + result.error, 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '経費申請',
      purpose: '',
      details: '',
      amount: '',
      urgency: 'normal',
      approvers: []
    });
    setApproverInput({ name: '', email: '', position: '' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '承認待ち';
      case 'approved': return '承認済み';
      case 'rejected': return '却下';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const getUrgencyLabel = (urgency) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return level ? level.label : urgency;
  };

  const getUrgencyColor = (urgency) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return level ? level.color : 'bg-gray-100 text-gray-700';
  };

  const filteredRingis = filterStatus === 'all' 
    ? ringis 
    : ringis.filter(r => r.finalStatus === filterStatus);

  const pendingCount = ringis.filter(r => r.finalStatus === 'pending').length;
  const approvedCount = ringis.filter(r => r.finalStatus === 'approved').length;
  const rejectedCount = ringis.filter(r => r.finalStatus === 'rejected').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">稟議システム</h1>
            <p className="text-gray-600">社内承認プロセスを電子化・効率化</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            新規稟議
          </button>
        </div>

        {/* Pending Approvals Alert */}
        {pendingApprovals.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-orange-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">
                  あなたの承認待ち: {pendingApprovals.length}件
                </h3>
                <p className="text-orange-800 text-sm mb-3">
                  以下の稟議があなたの承認を待っています
                </p>
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 3).map((ringi) => (
                    <button
                      key={ringi.id}
                      onClick={() => setSelectedRingi(ringi)}
                      className="block w-full text-left bg-white p-3 rounded-lg hover:bg-orange-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{ringi.title}</p>
                          <p className="text-sm text-gray-600">申請者: {ringi.requester}</p>
                        </div>
                        <ArrowRight className="text-orange-600" size={20} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FileText className="text-indigo-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">総稟議数</p>
                <p className="text-3xl font-bold text-gray-900">{ringis.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">承認待ち</p>
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
                <p className="text-sm text-gray-600">却下</p>
                <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            すべて ({ringis.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            承認待ち ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'approved' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            承認済み ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === 'rejected' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            却下 ({rejectedCount})
          </button>
        </div>

        {/* Ringi List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">稟議一覧</h2>
          </div>

          {filteredRingis.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="mx-auto mb-4 text-gray-300" size={60} />
              <p className="text-lg">稟議がまだありません</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRingis.map((ringi) => (
                <div 
                  key={ringi.id} 
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => setSelectedRingi(ringi)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <FileText className="text-indigo-600" size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{ringi.title}</h3>
                          <p className="text-sm text-gray-600">{ringi.category} • {ringi.requester}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 ml-15">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">申請日</p>
                          <p className="text-sm text-gray-900">
                            {new Date(ringi.requestDate).toLocaleDateString('ja-JP')}
                          </p>
                        </div>

                        {ringi.amount && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">金額</p>
                            <p className="text-sm font-bold text-gray-900">
                              ¥{ringi.amount.toLocaleString()}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-600 mb-1">承認段階</p>
                          <p className="text-sm text-gray-900">
                            {ringi.currentApprover + 1}/{ringi.approvalChain.length}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">緊急度</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(ringi.urgency)}`}>
                            {getUrgencyLabel(ringi.urgency)}
                          </span>
                        </div>
                      </div>

                      {/* Approval Chain Progress */}
                      <div className="ml-15 mt-4">
                        <div className="flex items-center gap-2">
                          {ringi.approvalChain.map((approver, index) => (
                            <React.Fragment key={index}>
                              <div className={`flex flex-col items-center`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  approver.status === 'approved' ? 'bg-green-100' :
                                  approver.status === 'rejected' ? 'bg-red-100' :
                                  index === ringi.currentApprover ? 'bg-yellow-100' :
                                  'bg-gray-100'
                                }`}>
                                  {approver.status === 'approved' ? (
                                    <CheckCircle className="text-green-600" size={20} />
                                  ) : approver.status === 'rejected' ? (
                                    <XCircle className="text-red-600" size={20} />
                                  ) : index === ringi.currentApprover ? (
                                    <Clock className="text-yellow-600" size={20} />
                                  ) : (
                                    <User className="text-gray-400" size={20} />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{approver.position}</p>
                              </div>
                              {index < ringi.approvalChain.length - 1 && (
                                <ArrowRight className="text-gray-400" size={16} />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(ringi.finalStatus)}`}>
                        {getStatusText(ringi.finalStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Ringi Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">新規稟議作成</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  件名 *
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="例: 新規システム導入について"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリー *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    緊急度 *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                  >
                    {urgencyLevels.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目的 *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  placeholder="稟議の目的を記入してください..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  詳細 *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={formData.details}
                  onChange={(e) => setFormData({...formData, details: e.target.value})}
                  placeholder="詳細な内容を記入してください..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  金額 (該当する場合)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-3 pl-8 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Approval Chain */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">承認フロー *</h3>
                
                {/* Current Approvers */}
                {formData.approvers.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {formData.approvers.map((approver, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{approver.name}</p>
                            <p className="text-sm text-gray-600">{approver.position} • {approver.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveApprover(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Approver */}
                <div className="space-y-3">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={approverInput.name}
                    onChange={(e) => setApproverInput({...approverInput, name: e.target.value})}
                    placeholder="承認者名"
                  />
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={approverInput.position}
                    onChange={(e) => setApproverInput({...approverInput, position: e.target.value})}
                    placeholder="役職 (例: 課長、部長、本部長)"
                  />
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={approverInput.email}
                    onChange={(e) => setApproverInput({...approverInput, email: e.target.value})}
                    placeholder="メールアドレス"
                  />
                  <button
                    onClick={handleAddApprover}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    承認者を追加
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  承認順に追加してください。上から順に承認が進みます。
                </p>
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <button
                  onClick={handleCreateRingi}
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      作成中...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      稟議を作成
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
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

      {/* Ringi Detail Modal */}
      {selectedRingi && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">稟議詳細</h2>
              <button
                onClick={() => setSelectedRingi(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="bg-indigo-50 p-6 rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedRingi.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {selectedRingi.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(selectedRingi.urgency)}`}>
                        {getUrgencyLabel(selectedRingi.urgency)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedRingi.finalStatus)}`}>
                        {getStatusText(selectedRingi.finalStatus)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">申請者</p>
                    <p className="font-medium text-gray-900">{selectedRingi.requester}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">申請日</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedRingi.requestDate).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {selectedRingi.amount && (
                    <div>
                      <p className="text-gray-600 mb-1">金額</p>
                      <p className="font-bold text-gray-900 text-lg">
                        ¥{selectedRingi.amount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Details */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">目的</h4>
                <p className="text-gray-700">{selectedRingi.purpose}</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-2">詳細</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedRingi.details}</p>
              </div>

              {/* Approval Chain */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4">承認フロー</h4>
                <div className="space-y-3">
                  {selectedRingi.approvalChain.map((approver, index) => {
                    const isCurrentApprover = index === selectedRingi.currentApprover && selectedRingi.finalStatus === 'pending';
                    const canApprove = isCurrentApprover && approver.email === user.email;

                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border-2 ${
                          approver.status === 'approved' ? 'bg-green-50 border-green-200' :
                          approver.status === 'rejected' ? 'bg-red-50 border-red-200' :
                          isCurrentApprover ? 'bg-yellow-50 border-yellow-300' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              approver.status === 'approved' ? 'bg-green-100' :
                              approver.status === 'rejected' ? 'bg-red-100' :
                              isCurrentApprover ? 'bg-yellow-100' :
                              'bg-gray-100'
                            }`}>
                              {approver.status === 'approved' ? (
                                <CheckCircle className="text-green-600" size={24} />
                              ) : approver.status === 'rejected' ? (
                                <XCircle className="text-red-600" size={24} />
                              ) : isCurrentApprover ? (
                                <Clock className="text-yellow-600" size={24} />
                              ) : (
                                <User className="text-gray-400" size={24} />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{approver.name}</p>
                              <p className="text-sm text-gray-600">{approver.position}</p>
                              {approver.approvedAt && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(approver.approvedAt).toLocaleString('ja-JP')}
                                </p>
                              )}
                            </div>
                          </div>

                          {approver.hanko && (
                            <div className="bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center font-bold border-2 border-red-700 shadow-lg">
                              <Stamp size={24} />
                            </div>
                          )}
                        </div>

                        {approver.comment && (
                          <div className="mt-3 pl-15">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex items-start gap-2">
                                <MessageSquare size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                                <p className="text-sm text-gray-700">{approver.comment}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {canApprove && (
                          <div className="mt-4 pl-15 flex gap-3">
                            <button
                              onClick={() => handleApproveReject(selectedRingi.id, index, 'approved')}
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={18} />
                              承認
                            </button>
                            <button
                              onClick={() => handleApproveReject(selectedRingi.id, index, 'rejected')}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} />
                              却下
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 border-t flex gap-3">
                {selectedRingi.requesterEmail === user.email && selectedRingi.finalStatus === 'pending' && (
                  <button
                    onClick={() => handleCancelRingi(selectedRingi.id)}
                    className="px-6 py-3 bg-gray-100 text-red-600 rounded-lg font-medium hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    稟議をキャンセル
                  </button>
                )}
                <button
                  onClick={() => setSelectedRingi(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}