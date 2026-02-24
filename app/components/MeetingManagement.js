// app/components/MeetingManagement.js
'use client';

import { useState, useEffect, createElement as h } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function MeetingManagement() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    participantIds: [],
    password: '',
  });

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meetings?organizerId=${user.uid}`);
      const data = await response.json();

      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('会議の読み込みエラー:', error);
      alert('会議一覧を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organizerId: user.uid,
          organizerEmail: user.email,
          organizer: user.fullName || user.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('会議が作成されました！\n\n会議URL: ' + data.meetingUrl);
        setShowForm(false);
        setFormData({
          title: '',
          description: '',
          scheduledAt: '',
          duration: 60,
          participantIds: [],
          password: '',
        });
        loadMeetings();
      } else {
        alert('エラー: ' + data.error);
      }
    } catch (error) {
      console.error('エラー:', error);
      alert('会議を作成できませんでした');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (meetingId) => {
    if (!confirm('この会議を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('会議が削除されました');
        loadMeetings();
      } else {
        alert('エラー: ' + data.error);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('会議を削除できませんでした');
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert('会議URLをコピーしました');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      scheduled: { text: '予定', color: 'bg-blue-100 text-blue-800' },
      ongoing: { text: '進行中', color: 'bg-green-100 text-green-800' },
      completed: { text: '完了', color: 'bg-gray-100 text-gray-800' },
      cancelled: { text: 'キャンセル', color: 'bg-red-100 text-red-800' },
    };

    const badge = statusMap[status] || statusMap.scheduled;
    return h('span', {
      className: `px-3 py-1 rounded-full text-xs font-medium ${badge.color}`
    }, badge.text);
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'scheduled') return meeting.status === 'scheduled';
    if (selectedTab === 'completed') return meeting.status === 'completed';
    return true;
  });

  // Header Section
  const renderHeader = () => {
    return h('div', { className: 'flex justify-between items-center mb-8' },
      h('div', null,
        h('h1', { className: 'text-3xl font-bold text-gray-900' }, '会議管理'),
        h('p', { className: 'text-gray-600 mt-1' }, 'Zoom会議の作成・管理')
      ),
      h('button', {
        onClick: () => setShowForm(!showForm),
        className: 'bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm'
      }, showForm ? 'キャンセル' : '+ 新規会議')
    );
  };

  // Form Section
  const renderForm = () => {
    if (!showForm) return null;

    return h('div', { className: 'bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100' },
      h('h2', { className: 'text-2xl font-bold mb-6 text-gray-900' }, '新しいZoom会議を作成'),
      h('form', { onSubmit: handleSubmit, className: 'space-y-6' },
        // Title Input
        h('div', null,
          h('label', { className: 'block text-sm font-bold mb-2 text-gray-900' },
            '会議タイトル ',
            h('span', { className: 'text-red-500' }, '*')
          ),
          h('input', {
            type: 'text',
            value: formData.title,
            onChange: (e) => setFormData({ ...formData, title: e.target.value }),
            className: 'w-full px-4 py-3 text-gray-900 font-medium bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400',
            placeholder: '例：週次ミーティング',
            required: true,
            style: { color: '#111827', fontWeight: '500' }
          })
        ),
        // Description Textarea
        h('div', null,
          h('label', { className: 'block text-sm font-bold mb-2 text-gray-900' }, '会議の説明'),
          h('textarea', {
            value: formData.description,
            onChange: (e) => setFormData({ ...formData, description: e.target.value }),
            className: 'w-full px-4 py-3 text-gray-900 font-medium bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400',
            rows: 4,
            placeholder: '会議の目的や議題を入力してください',
            style: { color: '#111827', fontWeight: '500' }
          })
        ),
        // Date and Duration
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
          h('div', null,
            h('label', { className: 'block text-sm font-bold mb-2 text-gray-900' },
              '開始日時 ',
              h('span', { className: 'text-red-500' }, '*')
            ),
            h('input', {
              type: 'datetime-local',
              value: formData.scheduledAt,
              onChange: (e) => setFormData({ ...formData, scheduledAt: e.target.value }),
              className: 'w-full px-4 py-3 text-gray-900 font-medium bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              required: true,
              style: { color: '#111827', fontWeight: '500' }
            })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-bold mb-2 text-gray-900' },
              '会議時間（分） ',
              h('span', { className: 'text-red-500' }, '*')
            ),
            h('select', {
              value: formData.duration,
              onChange: (e) => setFormData({ ...formData, duration: parseInt(e.target.value) }),
              className: 'w-full px-4 py-3 text-gray-900 font-medium bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all',
              style: { color: '#111827', fontWeight: '500' }
            },
              h('option', { value: 15 }, '15分'),
              h('option', { value: 30 }, '30分'),
              h('option', { value: 45 }, '45分'),
              h('option', { value: 60 }, '1時間'),
              h('option', { value: 90 }, '1時間30分'),
              h('option', { value: 120 }, '2時間')
            )
          )
        ),
        // Password Input
        h('div', null,
          h('label', { className: 'block text-sm font-bold mb-2 text-gray-900' }, 'パスワード（任意）'),
          h('input', {
            type: 'text',
            value: formData.password,
            onChange: (e) => setFormData({ ...formData, password: e.target.value }),
            className: 'w-full px-4 py-3 text-gray-900 font-medium bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400',
            placeholder: '会議のパスワードを設定（空白可）',
            style: { color: '#111827', fontWeight: '500' }
          }),
          h('p', { className: 'text-xs text-gray-600 mt-1 font-medium' }, '※ 空白の場合、自動生成されます')
        ),
        // Submit Buttons
        h('div', { className: 'flex gap-3 pt-4' },
          h('button', {
            type: 'submit',
            disabled: loading,
            className: 'flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm transition-all text-base'
          }, loading ? '作成中...' : '会議を作成'),
          h('button', {
            type: 'button',
            onClick: () => setShowForm(false),
            className: 'px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-bold text-gray-700'
          }, 'キャンセル')
        )
      )
    );
  };

  // Tabs Section
  const renderTabs = () => {
    return h('div', { className: 'border-b border-gray-200' },
      h('div', { className: 'flex' },
        h('button', {
          onClick: () => setSelectedTab('all'),
          className: `px-6 py-4 font-bold transition-colors ${selectedTab === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`
        }, `すべて (${meetings.length})`),
        h('button', {
          onClick: () => setSelectedTab('scheduled'),
          className: `px-6 py-4 font-bold transition-colors ${selectedTab === 'scheduled'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`
        }, `予定 (${meetings.filter(m => m.status === 'scheduled').length})`),
        h('button', {
          onClick: () => setSelectedTab('completed'),
          className: `px-6 py-4 font-bold transition-colors ${selectedTab === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`
        }, `完了 (${meetings.filter(m => m.status === 'completed').length})`)
      )
    );
  };

  // Meeting Card
  const renderMeetingCard = (meeting) => {
    return h('div', {
      key: meeting.id,
      className: 'border-2 border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white'
    },
      h('div', { className: 'flex justify-between items-start mb-4' },
        h('div', { className: 'flex-1' },
          h('div', { className: 'flex items-center gap-3 mb-2' },
            h('h3', { className: 'text-xl font-bold text-gray-900' }, meeting.title),
            getStatusBadge(meeting.status)
          ),
          meeting.description && h('p', { className: 'text-gray-700 mb-3 font-medium' }, meeting.description)
        )
      ),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' },
        h('div', { className: 'flex items-center text-gray-700' },
          h('svg', {
            className: 'w-5 h-5 mr-2',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor'
          },
            h('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            })
          ),
          h('span', { className: 'text-sm font-medium' }, formatDate(meeting.scheduledAt))
        ),
        h('div', { className: 'flex items-center text-gray-700' },
          h('svg', {
            className: 'w-5 h-5 mr-2',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor'
          },
            h('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            })
          ),
          h('span', { className: 'text-sm font-medium' }, `${meeting.duration}分`)
        )
      ),
      meeting.password && h('div', { className: 'bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mb-4' },
        h('div', { className: 'flex items-center text-sm' },
          h('svg', {
            className: 'w-4 h-4 mr-2 text-yellow-600',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor'
          },
            h('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
            })
          ),
          h('span', { className: 'text-yellow-800 font-bold' }, 'パスワード: '),
          h('span', { className: 'font-mono ml-2 text-yellow-900 font-bold text-base' }, meeting.password)
        )
      ),
      h('div', { className: 'bg-gray-50 rounded-lg p-3 mb-4 border-2 border-gray-200' },
        h('p', { className: 'text-xs text-gray-600 mb-1 font-bold' }, '会議URL'),
        h('div', { className: 'flex items-center gap-2' },
          h('input', {
            type: 'text',
            value: meeting.meetingUrl,
            readOnly: true,
            className: 'flex-1 text-sm bg-white border-2 border-gray-300 rounded px-3 py-2 font-mono text-gray-900 font-medium'
          }),
          h('button', {
            onClick: () => handleCopyLink(meeting.meetingUrl),
            className: 'px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold transition-colors text-gray-800'
          }, 'コピー')
        )
      ),
      h('div', { className: 'flex gap-2 pt-2' },
        h('a', {
          href: meeting.meetingUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-center font-bold transition-colors'
        }, '会議に参加'),
        h('button', {
          onClick: () => handleDelete(meeting.id),
          className: 'px-4 py-2.5 bg-red-50 text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-100 font-bold transition-colors'
        }, '削除')
      ),
      h('div', { className: 'mt-4 pt-4 border-t-2 border-gray-200' },
        h('p', { className: 'text-xs text-gray-500 font-medium' }, `ミーティングID: ${meeting.zoomMeetingId}`)
      )
    );
  };

  // Meetings List
  const renderMeetingsList = () => {
    if (loading) {
      return h('div', { className: 'text-center py-12' },
        h('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto' }),
        h('p', { className: 'text-gray-600 mt-4 font-medium' }, '読み込み中...')
      );
    }

    if (filteredMeetings.length === 0) {
      return h('div', { className: 'text-center py-12' },
        h('svg', {
          className: 'mx-auto h-12 w-12 text-gray-400',
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor'
        },
          h('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          })
        ),
        h('p', { className: 'text-gray-600 mt-4 font-medium' }, '会議がありません'),
        h('button', {
          onClick: () => setShowForm(true),
          className: 'mt-4 text-blue-600 hover:text-blue-700 font-bold'
        }, '最初の会議を作成')
      );
    }

    return h('div', { className: 'space-y-4' },
      ...filteredMeetings.map(meeting => renderMeetingCard(meeting))
    );
  };

  // Main Render
  return h('div', { className: 'container mx-auto p-6 max-w-6xl' },
    renderHeader(),
    renderForm(),
    h('div', { className: 'bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden' },
      renderTabs(),
      h('div', { className: 'p-6' },
        renderMeetingsList()
      )
    )
  );
}