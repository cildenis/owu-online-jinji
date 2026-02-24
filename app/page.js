'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import { Briefcase, Users, TrendingUp, CheckCircle, ArrowRight, Loader, MapPin, Calendar, DollarSign } from 'lucide-react';
import { getJobs } from './lib/firebaseDB';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setJobsLoading(true);
    const result = await getJobs('active');
    if (result.success) {
      setJobs(result.data);
    }
    setJobsLoading(false);
  };

  const handleLoginClick = () => {
    console.log('ログインボタンをクリックしました');
    router.push('/login');
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Briefcase className="text-blue-600" size={32} />
              <span className="text-2xl font-bold text-gray-900">
                Ow<span className="text-blue-600">U</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    ダッシュボード
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition cursor-pointer"
                >
                  ログイン
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI搭載の次世代
            <span className="text-blue-600">人事管理システム</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            採用、従業員管理、休暇申請をひとつのプラットフォームで。
            AIが最適な候補者を自動マッチング。
          </p>
        </div>

        {/* Jobs Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">募集中の求人</h2>
              <p className="text-gray-600">あなたにぴったりの仕事を見つけましょう</p>
            </div>
          </div>

          {jobsLoading ? (
            <div className="text-center py-12">
              <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
              <p className="text-gray-600">求人を読み込み中...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-100 text-center">
              <Briefcase className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-500">現在募集中の求人はありません</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {job.department}
                    </span>
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

                  <button
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    詳細を見る・応募する
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <Users className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">従業員管理</h3>
            <p className="text-gray-600">
              チームメンバーの情報を一元管理。勤怠、給与、評価まで全てをカバー。
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI採用支援</h3>
            <p className="text-gray-600">
              AIが履歴書を自動分析。最適な候補者を瞬時にマッチング。
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="text-purple-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">休暇管理</h3>
            <p className="text-gray-600">
              休暇申請から承認まで全自動。チーム全体の休暇状況を可視化。
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">一緒に働きませんか？</h2>
          <p className="text-xl mb-8 opacity-90">
            あなたのスキルを活かせる仕事が見つかります。
          </p>
          <button
            onClick={() => {
              const jobsSection = document.querySelector('.grid.md\\:grid-cols-2');
              jobsSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition text-lg inline-flex items-center gap-2"
          >
            求人を見る
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2025 OwU HR Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}