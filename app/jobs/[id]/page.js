'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Briefcase, MapPin, Calendar, DollarSign, Users, ArrowLeft, Upload, Loader, CheckCircle } from 'lucide-react';
import { getJobs, uploadCV, submitApplication } from '../../lib/firebaseDB';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    message: '',
    cvFile: null
  });

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setIsLoading(true);
    const result = await getJobs('active');
    if (result.success) {
      const foundJob = result.data.find(j => j.id === jobId);
      setJob(foundJob);
    }
    setIsLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('=== ファイル選択 ===');
      console.log('ファイル名:', file.name);
      console.log('ファイルサイズ:', file.size, 'bytes');
      console.log('ファイルタイプ:', file.type);
      
      // PDF or DOCX only
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('PDFまたはDOCXファイルのみアップロード可能です');
        return;
      }
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズは5MB以下にしてください');
        return;
      }
      
      console.log('✅ ファイル検証OK');
      setFormData({...formData, cvFile: file});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('\n===========================================');
    console.log('========== 応募フォーム送信開始 ==========');
    console.log('===========================================\n');

    if (!formData.applicantName || !formData.applicantEmail || !formData.cvFile) {
      alert('必須項目を入力してください');
      return;
    }

    console.log('📋 フォームデータ確認:');
    console.log('  - 名前:', formData.applicantName);
    console.log('  - メール:', formData.applicantEmail);
    console.log('  - 電話:', formData.applicantPhone);
    console.log('  - CVファイル:', formData.cvFile?.name);
    console.log('  - メッセージ長:', formData.message.length, '文字');

    setIsSubmitting(true);

    try {
      console.log('\n--- ステップ1: CVアップロード開始 ---');
      console.log('ファイル:', formData.cvFile.name);
      console.log('メール:', formData.applicantEmail);
      
      // 1. CVをFirebase Storageにアップロード
      const uploadResult = await uploadCV(formData.cvFile, formData.applicantEmail);
      
      console.log('Upload結果:', uploadResult);
      
      if (!uploadResult.success) {
        console.error('❌ CVアップロードエラー:', uploadResult.error);
        alert('履歴書のアップロードに失敗しました: ' + uploadResult.error);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ CVアップロード成功！');
      console.log('📎 CV URL:', uploadResult.url);

      console.log('\n--- ステップ2: 応募情報作成 ---');
      
      // 2. 応募情報をFirestoreに保存
      const applicationData = {
        jobId: jobId,
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicantPhone: formData.applicantPhone || '',
        coverLetter: formData.message || '',
        cvFileUrl: uploadResult.url, // ✅ 重要！
        cvText: '',
        status: 'pending',
        aiScore: null,
        aiAnalysis: null
      };

      console.log('送信する応募データ:');
      console.log(JSON.stringify(applicationData, null, 2));
      
      // cvFileUrl が確実に存在することを確認
      if (!applicationData.cvFileUrl) {
        console.error('❌ ERROR: cvFileUrl が空です！');
        alert('エラー: CV URLが取得できませんでした');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ cvFileUrl 確認完了:', applicationData.cvFileUrl);

      console.log('\n--- ステップ3: Firestore保存開始 ---');
      const submitResult = await submitApplication(applicationData);
      
      console.log('Submit結果:', submitResult);

      if (submitResult.success) {
        console.log('✅✅✅ 応募完了！✅✅✅');
        console.log('Application ID:', submitResult.data?.id);
        console.log('\n===========================================');
        console.log('=========== 応募処理完了しました ===========');
        console.log('===========================================\n');
        setSubmitted(true);
      } else {
        console.error('❌ 応募保存エラー:', submitResult.error);
        alert('応募の送信に失敗しました: ' + submitResult.error);
      }

    } catch (error) {
      console.error('\n❌❌❌ 応募エラー ❌❌❌');
      console.error('エラータイプ:', error.name);
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);
      alert('エラーが発生しました: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
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

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">求人が見つかりません</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            トップページに戻る
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">応募完了！</h2>
          <p className="text-gray-600 mb-6">
            ご応募ありがとうございます。<br/>
            確認メールを送信しました。<br/>
            3-5営業日以内にご連絡いたします。
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            トップページに戻る
          </button>
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

            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              戻る
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {job.department}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={20} className="text-gray-400" />
                  <span>{job.location || '東京'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={20} className="text-gray-400" />
                  <span>{job.type === 'full-time' ? '正社員' : job.type === 'part-time' ? 'パート' : '契約社員'}</span>
                </div>
                {job.salary && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign size={20} className="text-gray-400" />
                    <span>¥{parseInt(job.salary).toLocaleString('ja-JP')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Users size={20} className="text-gray-400" />
                  <span>募集中</span>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">仕事内容</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>

              {job.requirements && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">応募資格</h2>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Application Form */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">応募フォーム</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    お名前 *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="山田太郎"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({...formData, applicantName: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example@email.com"
                    value={formData.applicantEmail}
                    onChange={(e) => setFormData({...formData, applicantEmail: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="090-1234-5678"
                    value={formData.applicantPhone}
                    onChange={(e) => setFormData({...formData, applicantPhone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    履歴書 (PDF/DOCX) *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload"
                      required
                    />
                    <label htmlFor="cv-upload" className="cursor-pointer block">
                      <Upload className="mx-auto text-gray-400 mb-2" size={40} />
                      {formData.cvFile ? (
                        <p className="text-sm text-green-600 font-medium">{formData.cvFile.name}</p>
                      ) : (
                        <p className="text-sm text-gray-600 font-medium">クリックしてファイルを選択</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">PDF/DOCX (最大5MB)</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メッセージ (任意)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="志望動機や自己PRをご記入ください"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      送信中...
                    </>
                  ) : (
                    '応募する'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}