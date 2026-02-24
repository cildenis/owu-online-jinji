// app/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader, Users, Briefcase, Calendar, LogOut, FileText,
  Clock, Activity, Video, Home, Bell, ChevronRight, Search
} from 'lucide-react';
import {
  getEmployeesCount, getPendingLeaves, getActiveJobs, getTodayMeetings, getApplicationsCount,
  getPendingRingiCount, getPendingOvertimeCount, getUpcomingHealthCheckCount, getUpcomingHolidaysCount,
  getTotalLeaveCount, getTotalOvertimeCount, getTotalHealthCheckCount, getTotalMeetingsCount
} from '../lib/firebaseDB';
import EmployeeManagement from '../components/EmployeeManagement';
import LeaveManagement from '../components/LeaveManagement';
import JobPosting from '../components/JobPosting';
import Applications from '../components/Applications';
import RingiSystem from '../components/RingiSystem';
import OvertimeManagement from '../components/OvertimeManagement';
import HealthCheckManagement from '../components/HealthCheckManagement';
import HolidayCalendar from '../components/HolidayCalendar';
import MeetingManagement from '../components/MeetingManagement';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('home');
  const [notification, setNotification] = useState(null);

  // Real data states
  const [stats, setStats] = useState({
    employees: 0,
    pendingLeaves: 0,
    totalLeaves: 0,
    activeJobs: 0,
    todayMeetings: 0,
    totalMeetings: 0,
    applications: 0,
    ringi: 0,
    overtime: 0,
    totalOvertime: 0,
    health: 0,
    totalHealth: 0,
    holidays: 0,
    loading: true
  });

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch real data from Firebase
  useEffect(() => {
    if (user && currentPage === 'home') {
      loadStats();
    }
  }, [user, currentPage]);

  const loadStats = async () => {
    try {
      const [
        employees, leaves, totalLeaves, jobs, todayMeetings, totalMeetings, apps,
        ringi, overtime, totalOvertime, health, totalHealth, holidays
      ] = await Promise.all([
        getEmployeesCount(),
        getPendingLeaves(),
        getTotalLeaveCount(),
        getActiveJobs(),
        getTodayMeetings(),
        getTotalMeetingsCount(),
        getApplicationsCount(),
        getPendingRingiCount(),
        getPendingOvertimeCount(),
        getTotalOvertimeCount(),
        getUpcomingHealthCheckCount(),
        getTotalHealthCheckCount(),
        getUpcomingHolidaysCount()
      ]);

      setStats({
        employees,
        pendingLeaves: leaves,
        totalLeaves,
        activeJobs: jobs,
        todayMeetings,
        totalMeetings,
        applications: apps,
        ringi,
        overtime,
        totalOvertime,
        health,
        totalHealth,
        holidays,
        loading: false
      });
    } catch (error) {
      console.error('Stats loading error:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    const { logoutUser } = await import('../lib/firebaseDB');
    await logoutUser();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const modules = [
    {
      id: 'employees',
      icon: Users,
      label: '従業員管理',
      description: 'チームメンバーの情報管理',
      count: stats.employees,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverBg: 'hover:bg-blue-100',
      borderColor: 'hover:border-blue-300'
    },
    {
      id: 'leave',
      icon: Calendar,
      label: '休暇管理',
      description: '休暇申請の確認と承認',
      count: stats.totalLeaves,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverBg: 'hover:bg-green-100',
      borderColor: 'hover:border-green-300'
    },
    {
      id: 'jobs',
      icon: Briefcase,
      label: '求人管理',
      description: '求人情報の作成と公開',
      count: stats.activeJobs,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverBg: 'hover:bg-purple-100',
      borderColor: 'hover:border-purple-300'
    },
    {
      id: 'applications',
      icon: FileText,
      label: '応募管理',
      description: '応募者のAI分析',
      count: stats.applications,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverBg: 'hover:bg-orange-100',
      borderColor: 'hover:border-orange-300'
    },
    {
      id: 'ringi',
      icon: FileText,
      label: '稟議システム',
      description: '稟議書の作成と承認',
      count: stats.ringi,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-100',
      borderColor: 'hover:border-indigo-300'
    },
    {
      id: 'overtime',
      icon: Clock,
      label: '残業管理',
      description: '残業申請と承認処理',
      count: stats.totalOvertime,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      hoverBg: 'hover:bg-red-100',
      borderColor: 'hover:border-red-300'
    },
    {
      id: 'health',
      icon: Activity,
      label: '健康診断',
      description: '従業員の健康管理',
      count: stats.totalHealth,
      iconColor: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hoverBg: 'hover:bg-pink-100',
      borderColor: 'hover:border-pink-300'
    },
    {
      id: 'holidays',
      icon: Calendar,
      label: '祝日カレンダー',
      description: '祝日・休日の管理',
      count: stats.holidays,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      hoverBg: 'hover:bg-amber-100',
      borderColor: 'hover:border-amber-300'
    },
    {
      id: 'meetings',
      icon: Video,
      label: '会議管理',
      description: 'Zoom会議の予約管理',
      count: stats.totalMeetings,
      iconColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      hoverBg: 'hover:bg-cyan-100',
      borderColor: 'hover:border-cyan-300'
    },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'employees':
        return <EmployeeManagement showNotification={showNotification} />;
      case 'leave':
        return <LeaveManagement user={user} showNotification={showNotification} />;
      case 'jobs':
        return <JobPosting showNotification={showNotification} />;
      case 'applications':
        return <Applications showNotification={showNotification} />;
      case 'ringi':
        return <RingiSystem user={user} showNotification={showNotification} />;
      case 'overtime':
        return <OvertimeManagement user={user} showNotification={showNotification} />;
      case 'health':
        return <HealthCheckManagement user={user} showNotification={showNotification} />;
      case 'holidays':
        return <HolidayCalendar user={user} showNotification={showNotification} />;
      case 'meetings':
        return <MeetingManagement />;

      default:
        return (
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                      {user.role === 'admin' ? '管理者' : user.role === 'manager' ? 'マネージャー' : '社員'}
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">
                    おかえりなさい、{user.fullName || user.email.split('@')[0]}さん
                  </h1>
                  <p className="text-blue-100">
                    {new Date().toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold">{new Date().getDate()}</div>
                      <div className="text-xs opacity-80">{new Date().toLocaleDateString('ja-JP', { month: 'short' })}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-600" size={24} />
                  </div>
                </div>
                <div className="text-gray-600 text-sm mb-1">従業員数</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.loading ? '...' : stats.employees}
                  </div>
                  <div className="text-gray-500 text-sm">名</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-green-600" size={24} />
                  </div>
                  {stats.pendingLeaves > 0 && (
                    <div className="px-2 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-700">
                      承認待ち
                    </div>
                  )}
                </div>
                <div className="text-gray-600 text-sm mb-1">休暇申請</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.loading ? '...' : stats.totalLeaves}
                  </div>
                  <div className="text-gray-500 text-sm">件</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Briefcase className="text-purple-600" size={24} />
                  </div>
                </div>
                <div className="text-gray-600 text-sm mb-1">公開中の求人</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.loading ? '...' : stats.activeJobs}
                  </div>
                  <div className="text-gray-500 text-sm">件</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Video className="text-cyan-600" size={24} />
                  </div>
                </div>
                <div className="text-gray-600 text-sm mb-1">今日の会議</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.loading ? '...' : stats.totalMeetings}
                  </div>
                  <div className="text-gray-500 text-sm">件</div>
                </div>
              </div>
            </div>

            {/* Main Modules */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">システム機能</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      onClick={() => setCurrentPage(module.id)}
                      className={`group bg-white rounded-xl p-6 border border-gray-100 ${module.borderColor} hover:shadow-lg transition-all cursor-pointer`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 ${module.bgColor} rounded-xl flex items-center justify-center ${module.hoverBg} transition-colors`}>
                          <Icon className={`${module.iconColor}`} size={28} />
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" size={20} />
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {module.label}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {module.description}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-bold text-gray-900">
                          {stats.loading ? '...' : module.count}
                        </div>
                        <div className="text-sm text-gray-500">件</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Briefcase className="text-white" size={20} />
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900">
                    Ow<span className="text-blue-600">U</span>
                  </span>
                  <div className="text-xs text-gray-500">人事システム</div>
                </div>
              </div>

              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="検索..."
                    className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell size={20} className="text-gray-600" />
                {stats.pendingLeaves > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user.email.split('@')[0]}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderPage()}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 ${notification.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center font-bold">
            {notification.type === 'success' ? '✓' : '×'}
          </div>
          <p className="font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  );
}