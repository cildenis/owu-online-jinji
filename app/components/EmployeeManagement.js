'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone, Briefcase, Calendar, DollarSign, X, Edit2, Trash2, Loader } from 'lucide-react';
import { getEmployees, addEmployee, deleteEmployee } from '../lib/firebaseDB';

export default function EmployeeManagement({ showNotification }) {
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hireDate: '',
    salary: '',
    status: 'active'
  });

  // Sayfa yüklendiğinde Firebase'den çalışanları yükle
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    console.log('従業員を Firebase から読み込んでいます...');
    
    const result = await getEmployees();
    
    if (result.success) {
      console.log('アップロード済み:', result.data);
      setEmployees(result.data);
    } else {
      console.error('エラー:', result.error);
      if (showNotification) {
        showNotification('従業員の読み込みに失敗しました', 'error');
      }
    }
    
    setIsLoading(false);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      if (showNotification) {
        showNotification('氏名を入力してください', 'error');
      } else {
        alert('氏名を入力してください');
      }
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      if (showNotification) {
        showNotification('有効なメールアドレスを入力してください', 'error');
      } else {
        alert('有効なメールアドレスを入力してください');
      }
      return false;
    }

    if (!formData.phone.trim()) {
      if (showNotification) {
        showNotification('電話番号を入力してください', 'error');
      } else {
        alert('電話番号を入力してください');
      }
      return false;
    }

    if (!formData.department) {
      if (showNotification) {
        showNotification('部署を選択してください', 'error');
      } else {
        alert('部署を選択してください');
      }
      return false;
    }

    if (!formData.position.trim()) {
      if (showNotification) {
        showNotification('役職を入力してください', 'error');
      } else {
        alert('役職を入力してください');
      }
      return false;
    }

    if (!formData.hireDate) {
      if (showNotification) {
        showNotification('入社日を入力してください', 'error');
      } else {
        alert('入社日を入力してください');
      }
      return false;
    }

    return true;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) {
      return;
    }

    console.log('追加される従業員:', formData);

    //Firebase'e ekle
    const result = await addEmployee(formData);
    
    if (result.success) {
      console.log('正常に追加されました!');
      
      //Listeyi yenile
      await loadEmployees();
      
      setShowAddModal(false);
      resetForm();
      
      if (showNotification) {
        showNotification('従業員が追加されました！', 'success');
      } else {
        alert('従業員が追加されました！');
      }
    } else {
      console.error('追加エラー:', result.error);
      if (showNotification) {
        showNotification('追加に失敗しました: ' + result.error, 'error');
      } else {
        alert('追加に失敗しました: ' + result.error);
      }
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (confirm('この従業員を削除してもよろしいですか？')) {
      console.log('削除中:', id);
      
      //Firebase'den sil
      const result = await deleteEmployee(id);
      
      if (result.success) {
        console.log('削除されました!');
        
        //Listeyi yenile
        await loadEmployees();
        
        if (showNotification) {
          showNotification('従業員が削除されました', 'success');
        } else {
          alert('従業員が削除されました');
        }
      } else {
        console.error('削除エラー:', result.error);
        if (showNotification) {
          showNotification('削除に失敗しました: ' + result.error, 'error');
        } else {
          alert('削除に失敗しました');
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      hireDate: '',
      salary: '',
      status: 'active'
    });
  };

  const activeCount = employees.filter(e => e.status === 'active').length;
  const departments = [...new Set(employees.map(e => e.department))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">従業員管理</h1>
            <p className="text-gray-600">チームメンバーを表示・管理</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            新規従業員追加
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">総従業員数</p>
                <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">在籍従業員</p>
                <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Briefcase className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">部署数</p>
                <p className="text-3xl font-bold text-purple-600">{departments.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">従業員</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">連絡先</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">部署</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">役職</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">入社日</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">ステータス</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      従業員がまだ登録されていません
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">
                              {employee.fullName ? employee.fullName.charAt(0) : '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {employee.fullName || '名前なし'}
                            </p>
                            <button
                              onClick={() => setSelectedEmployee(employee)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              プロフィール表示
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            {employee.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} />
                            {employee.phone}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {employee.department}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{employee.position}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={14} />
                          {employee.hireDate}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          employee.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {employee.status === 'active' ? '在籍' : '退職'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedEmployee(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="編集"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">新規従業員追加</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    氏名 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="例: 田中 一郎"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="tanaka@owu.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号 *
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="090-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    部署 *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    <option value="">選択してください</option>
                    <option value="エンジニアリング">エンジニアリング</option>
                    <option value="デザイン">デザイン</option>
                    <option value="人事部">人事部</option>
                    <option value="営業部">営業部</option>
                    <option value="マーケティング">マーケティング</option>
                    <option value="財務部">財務部</option>
                    <option value="業務部">業務部</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    役職 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="例: シニア開発者"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    入社日 *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    給与 (円)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="350000"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">在籍</option>
                    <option value="inactive">退職</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddEmployee}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  従業員を追加
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
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

      {/* Profile Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">従業員プロフィール</h2>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-2xl">
                    {selectedEmployee.fullName ? selectedEmployee.fullName.charAt(0) : '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedEmployee.fullName || '名前なし'}
                  </h3>
                  <p className="text-gray-600">{selectedEmployee.position}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    selectedEmployee.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedEmployee.status === 'active' ? '在籍' : '退職'}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Mail size={18} />
                    <span className="text-sm font-medium">メールアドレス</span>
                  </div>
                  <p className="text-gray-900">{selectedEmployee.email}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Phone size={18} />
                    <span className="text-sm font-medium">電話番号</span>
                  </div>
                  <p className="text-gray-900">{selectedEmployee.phone}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Briefcase size={18} />
                    <span className="text-sm font-medium">部署</span>
                  </div>
                  <p className="text-gray-900">{selectedEmployee.department}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar size={18} />
                    <span className="text-sm font-medium">入社日</span>
                  </div>
                  <p className="text-gray-900">{selectedEmployee.hireDate}</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <DollarSign size={18} />
                    <span className="text-sm font-medium">給与</span>
                  </div>
                  <p className="text-gray-900">
                    {selectedEmployee.salary ? selectedEmployee.salary.toLocaleString('ja-JP') : '0'} 円
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="w-full mt-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
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