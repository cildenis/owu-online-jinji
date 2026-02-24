'use client';

import React, { useState } from 'react';
import { LogIn, User, Lock, Zap, AlertCircle } from 'lucide-react';
import { loginUser } from '../lib/firebaseDB';

export default function Login({ onLogin, showNotification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      if (showNotification) {
        showNotification('メールアドレスとパスワードを入力してください', 'error');
      } else {
        alert('メールアドレスとパスワードを入力してください');
      }
      return;
    }

    setIsLoading(true);
    console.log('ログインプロセスが開始されました...');

    //Firebase'den login
    const result = await loginUser(email, password);

    console.log('ログイン結果:', result);

    if (result.success) {
      console.log('ログイン成功！ ユーザー:', result.user);
      
      if (showNotification) {
        showNotification(`ようこそ、${result.user.fullName || result.user.email}さん！`, 'success');
      }
      
      console.log('onLoginを呼び出しています...');
      onLogin(result.user);
    } else {
      console.error('ログインに失敗しました：', result.error);
      
      if (showNotification) {
        showNotification('メールアドレスまたはパスワードが正しくありません', 'error');
      } else {
        alert('メールアドレスまたはパスワードが正しくありません');
      }
    }
    
    setIsLoading(false);
  };

  const quickLogin = async (demoEmail, demoPassword) => {
    console.log('クイックログイン:', demoEmail);
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    setIsLoading(true);
    
    const result = await loginUser(demoEmail, demoPassword);
    
    console.log('クイックログイン結果:', result);
    
    if (result.success) {
      console.log('クイックログインに成功しました！ ユーザー:', result.user);
      
      if (showNotification) {
        showNotification(`ようこそ、${result.user.fullName || result.user.email}さん！`, 'success');
      }
      
      console.log('onLogin を呼び出しています...');
      onLogin(result.user);
    } else {
      console.error('クイックログインに失敗しました:', result.error);
      
      if (showNotification) {
        showNotification('ログインに失敗しました', 'error');
      } else {
        alert('ログインに失敗しました');
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="text-blue-600" size={40} />
            <span className="text-4xl font-bold text-gray-900">Ow<span className="text-blue-600">U</span></span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ログイン</h2>
          <p className="text-gray-600">アカウントにログイン</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <div className="relative">
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-gray-900"
                placeholder="email@owu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <div className="relative">
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-gray-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ログイン中...
              </>
            ) : (
              <>
                <LogIn size={20} />
                ログイン
              </>
            )}
          </button>
        </form>

        {/* Quick Login Buttons */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800 font-medium mb-3 flex items-center gap-1">
            <AlertCircle size={14} />
            デモアカウント（クリックで自動ログイン）:
          </p>
          <div className="space-y-2 text-xs text-blue-700">
            <button
              type="button"
              onClick={() => quickLogin('admin@owu.com', 'admin123')}
              disabled={isLoading}
              className="w-full text-left p-2 hover:bg-blue-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <strong>管理者:</strong> admin@owu.com / admin123
            </button>
            <button
              type="button"
              onClick={() => quickLogin('taro@owu.com', 'emp123')}
              disabled={isLoading}
              className="w-full text-left p-2 hover:bg-blue-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <strong>従業員:</strong> taro@owu.com / emp123
            </button>
            <button
              type="button"
              onClick={() => quickLogin('test@email.com', 'app123')}
              disabled={isLoading}
              className="w-full text-left p-2 hover:bg-blue-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <strong>応募者:</strong> test@email.com / app123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}