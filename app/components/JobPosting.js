'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, X, Calendar, DollarSign, MapPin, Users, Loader } from 'lucide-react';
import { getJobs, addJob } from '../lib/firebaseDB';

export default function JobPosting({ showNotification }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    salary: '',
    description: '',
    requirements: '',
    status: 'active'
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    console.log('求人情報を読み込んでいます...');
    
    const result = await getJobs('active');
    
    if (result.success) {
      console.log('求人情報がアップロードされました:', result.data);
      setJobs(result.data);
    } else {
      console.error('読み込みエラー:', result.error);
      if (showNotification) {
        showNotification('求人の読み込みに失敗しました', 'error');
      }
    }
    
    setIsLoading(false);
  };

  const handleAddJob = async () => {
    if (!formData.title.trim() || !formData.department || !formData.description.trim()) {
      if (showNotification) {
        showNotification('必須項目を入力してください', 'error');
      }
      return;
    }

    console.log('求人情報が追加されます:', formData);

    const result = await addJob(formData);
    
    if (result.success) {
      console.log('求人情報を追加しました！');
      
      await loadJobs();
      
      setShowAddModal(false);
      resetForm();
      
      if (showNotification) {
        showNotification('求人が追加されました！', 'success');
      }
    } else {
      console.error('追加エラー:', result.error);
      if (showNotification) {
        showNotification('追加に失敗しました: ' + result.error, 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      location: '',
      type: 'full-time',
      salary: '',
      description: '',
      requirements: '',
      status: 'active'
    });
  };

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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">求人管理</h1>
            <p className="text-gray-600">求人情報を作成・管理</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            新規求人作成
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Briefcase className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">掲載中の求人</p>
                <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="grid md:grid-cols-2 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-2 bg-white p-12 rounded-xl shadow-lg border border-gray-100 text-center">
              <Briefcase className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-500">求人がまだ登録されていません</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {job.department}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    {job.location || '東京'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    {job.type === 'full-time' ? '正社員' : job.type === 'part-time' ? 'パート' : '契約社員'}
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign size={16} />
                      ¥{parseInt(job.salary).toLocaleString('ja-JP')}
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {job.description}
                </p>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedJob(job)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    詳細を見る
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">新規求人作成</h2>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    求人タイトル *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="例: フルスタック開発者"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                    <option value="営業">営業</option>
                    <option value="マーケティング">マーケティング</option>
                    <option value="人事">人事</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    勤務地
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="東京"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    雇用形態
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="full-time">正社員</option>
                    <option value="part-time">パート</option>
                    <option value="contract">契約社員</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年収 (円)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="5000000"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    仕事内容 *
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    rows="4"
                    placeholder="仕事の詳細を記入してください"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    応募資格
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    rows="4"
                    placeholder="必要なスキル、経験など"
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddJob}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  求人を作成
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

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {selectedJob.department}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={20} className="text-gray-400" />
                  <span>{selectedJob.location || '東京'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={20} className="text-gray-400" />
                  <span>{selectedJob.type === 'full-time' ? '正社員' : selectedJob.type === 'part-time' ? 'パート' : '契約社員'}</span>
                </div>
                {selectedJob.salary && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign size={20} className="text-gray-400" />
                    <span>¥{parseInt(selectedJob.salary).toLocaleString('ja-JP')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Users size={20} className="text-gray-400" />
                  <span>募集中</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">仕事内容</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>
                </div>
              </div>

              {selectedJob.requirements && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">応募資格</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.requirements}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
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