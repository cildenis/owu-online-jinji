'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Users, Mail, Download, Eye, X, CheckCircle, XCircle, Loader, Zap } from 'lucide-react';
import { getApplications, updateApplication } from '../lib/firebaseDB';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Applications({ showNotification }) {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setIsLoading(true);
    console.log('アプリケーションを読み込んでいます...');

    const result = await getApplications();

    if (result.success) {
      console.log('アプリケーションがアップロードされました:', result.data);
      setApplications(result.data);
    } else {
      console.error('読み込みエラー:', result.error);
      if (showNotification) {
        showNotification('応募の読み込みに失敗しました', 'error');
      }
    }

    setIsLoading(false);
  };

  const analyzeWithAI = async (application) => {
    setIsAnalyzing(true);
    console.log('AI解析を開始しています…');
    console.log('アプリケーションデータ:', application);

    try {
      // Job bilgisini Firebase'den al
      let jobTitle = 'ポジション情報なし';
      let jobDescription = '説明なし';

      if (application.jobId) {
        try {
          const jobRef = doc(db, 'jobs', application.jobId);
          const jobSnap = await getDoc(jobRef);

          if (jobSnap.exists()) {
            const jobData = jobSnap.data();
            jobTitle = jobData.title || jobTitle;
            jobDescription = jobData.description || jobDescription;
            console.log('求人情報が取得されました:', { jobTitle, jobDescription });
          } else {
            console.warn('求人情報が見つかりません:', application.jobId);
          }
        } catch (jobError) {
          console.error('求人情報の取得エラー:', jobError);
        }
      }

      // CV Text Check
      let cvText = application.cvText || application.resume || '';
      const cvFileUrl = application.cvFileUrl || '';

      if (!cvText && !cvFileUrl) {
        if (showNotification) {
          showNotification('履歴書がアップロードされていません', 'error');
        }
        setIsAnalyzing(false);
        return;
      }

      console.log('API リクエストを送信中...', {
        cvTextLength: cvText ? cvText.length : 0,
        hasCvFile: !!cvFileUrl,
        jobTitle,
        jobDescription: jobDescription.substring(0, 50) + '...'
      });

      // OpenAI API call
      const response = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvText: cvText,
          cvFileUrl: cvFileUrl,
          jobTitle: jobTitle,
          jobDescription: jobDescription,
          jobRequirements: application.jobRequirements || ''
        }),
      });

      console.log('API 応答ステータス:', response.status);

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API 応答データ:', data);

      if (data.success && data.analysis) {
        console.log('AI分析が完了しました:', data.analysis);

        // Update Firestore
        await updateApplication(application.id, {
          aiScore: data.analysis.score,
          aiAnalysis: data.analysis,
          status: data.analysis.score >= 70 ? 'interview' : 'reviewed'
        });

        // Puan 70+ ise mail gönder
        if (data.analysis.score >= 70) {
          await sendInterviewEmail(application, data.analysis, jobTitle);
        }

        // State'i güncelle
        const updatedApps = applications.map(app =>
          app.id === application.id
            ? {
              ...app,
              aiScore: data.analysis.score,
              aiAnalysis: data.analysis,
              status: data.analysis.score >= 70 ? 'interview' : 'reviewed',
              jobTitle: jobTitle  // Job title'ı da ekle
            }
            : app
        );
        setApplications(updatedApps);

        if (showNotification) {
          showNotification(
            `AI分析完了！スコア: ${data.analysis.score}点`,
            data.analysis.score >= 70 ? 'success' : 'info'
          );
        }
      } else {
        console.error('AI分析エラー:', data.error);
        if (showNotification) {
          showNotification('AI分析に失敗しました: ' + (data.error || '不明なエラー'), 'error');
        }
      }
    } catch (error) {
      console.error('フェッチエラー:', error);
      if (showNotification) {
        showNotification('エラーが発生しました: ' + error.message, 'error');
      }
    }

    setIsAnalyzing(false);
  };

  const sendInterviewEmail = async (application, analysis, jobTitle) => {
    console.log('面接メールを送信しています...');

    try {
      const response = await fetch('/api/send-interview-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantName: application.applicantName,
          applicantEmail: application.applicantEmail,
          score: analysis.score,
          jobTitle: jobTitle
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('メールが送信されました!');
        if (showNotification) {
          showNotification('面接メールを送信しました！', 'success');
        }
      }
    } catch (error) {
      console.error('メール送信エラー:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return !app.aiScore;
    if (filterStatus === 'high-score') return app.aiScore >= 70;
    if (filterStatus === 'low-score') return app.aiScore && app.aiScore < 70;
    return true;
  });

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">応募管理</h1>
            <p className="text-gray-600">応募者の履歴書を確認・AI分析</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">総応募数</p>
                <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Loader className="text-yellow-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">未分析</p>
                <p className="text-3xl font-bold text-gray-900">
                  {applications.filter(a => !a.aiScore).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">70点以上</p>
                <p className="text-3xl font-bold text-green-600">
                  {applications.filter(a => a.aiScore >= 70).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <XCircle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">70点未満</p>
                <p className="text-3xl font-bold text-red-600">
                  {applications.filter(a => a.aiScore && a.aiScore < 70).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            すべて ({applications.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            未分析 ({applications.filter(a => !a.aiScore).length})
          </button>
          <button
            onClick={() => setFilterStatus('high-score')}
            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'high-score' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            高得点 ({applications.filter(a => a.aiScore >= 70).length})
          </button>
          <button
            onClick={() => setFilterStatus('low-score')}
            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'low-score' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            低得点 ({applications.filter(a => a.aiScore && a.aiScore < 70).length})
          </button>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">応募者</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">求人</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">応募日</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">AIスコア</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">ステータス</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      応募者がまだいません
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{app.applicantName}</p>
                          <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">{app.jobTitle || '求人タイトル'}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-600">{app.appliedAt}</p>
                      </td>
                      <td className="p-4">
                        {app.aiScore ? (
                          <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${app.aiScore >= 70 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {app.aiScore}
                            </div>
                            <span className="text-sm text-gray-600">点</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">未分析</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === 'interview' ? 'bg-green-100 text-green-700' :
                          app.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                          {app.status === 'interview' ? '面接予定' :
                            app.status === 'reviewed' ? '確認済み' :
                              '未確認'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="詳細を見る"
                          >
                            <Eye size={16} />
                          </button>
                          {!app.aiScore && (
                            <button
                              onClick={() => analyzeWithAI(app)}
                              disabled={isAnalyzing}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                              title="AI分析"
                            >
                              {isAnalyzing ? (
                                <Loader className="animate-spin" size={16} />
                              ) : (
                                <Zap size={16} />
                              )}
                            </button>
                          )}
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

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">応募詳細</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">応募者名</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApp.applicantName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">メール</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApp.applicantEmail}</p>
                </div>
              </div>

              {selectedApp.aiScore && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="text-purple-600" size={20} />
                    AI分析結果
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`text-6xl font-bold ${selectedApp.aiScore >= 70 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {selectedApp.aiScore}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">総合スコア</p>
                      <p className={`text-lg font-semibold ${selectedApp.aiScore >= 70 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {selectedApp.aiScore >= 70 ? '面接推奨' : '要検討'}
                      </p>
                    </div>
                  </div>
                  {selectedApp.aiAnalysis && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">
                        <strong>強み:</strong> {
                          Array.isArray(selectedApp.aiAnalysis.strengths)
                            ? selectedApp.aiAnalysis.strengths.join(', ')
                            : selectedApp.aiAnalysis.strengths
                        }
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>弱み:</strong> {
                          Array.isArray(selectedApp.aiAnalysis.weaknesses)
                            ? selectedApp.aiAnalysis.weaknesses.join(', ')
                            : selectedApp.aiAnalysis.weaknesses
                        }
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>コメント:</strong> {selectedApp.aiAnalysis.comment}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">履歴書内容</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {selectedApp.cvText || selectedApp.resume || (
                      selectedApp.cvFileUrl ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">テキストを表示できません</p>
                          <a
                            href={selectedApp.cvFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline font-medium"
                          >
                            <Download size={16} />
                            原本ファイルを開く (PDF/DOCX)
                          </a>
                        </div>
                      ) : '履歴書がありません'
                    )}
                  </pre>
                </div>
              </div>

              {!selectedApp.aiScore && (
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    analyzeWithAI(selectedApp);
                  }}
                  disabled={isAnalyzing}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      AI分析を実行
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}