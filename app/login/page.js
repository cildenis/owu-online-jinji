'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Login from '../components/Login';

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Zaten login olduysa dashboard'a yönlendir
  React.useEffect(() => {
    if (user) {
      console.log('ユーザー ログインはダッシュボードにリダイレクトされます。');
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLoginSuccess = (userData) => {
    console.log('ログイン成功:', userData);
    router.push('/dashboard');
  };

  const showNotification = (message, type) => {
    if (type === 'success') {
      console.log('✅', message);
    } else {
      console.error('❌', message);
    }
  };

  if (user) {
    return null;
  }

  return <Login onLogin={handleLoginSuccess} showNotification={showNotification} />;
}