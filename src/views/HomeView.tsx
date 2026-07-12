import React, { useState } from 'react';
import { PlusCircle, Search, Users, Database, ShieldAlert, Award } from 'lucide-react';
import { checkGroupDuplicate, createGroup, findGroupForAdmin } from '../services/groupService';
import { generateAdminPassword } from '../utils/matching';
import { isFirebaseConfigured } from '../firebase';

interface HomeViewProps {
  onNavigate: (view: string, groupId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function HomeView({ onNavigate, showToast }: HomeViewProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'find'>('create');
  
  // Create state
  const [groupName, setGroupName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [loading, setLoading] = useState(false);

  // Find state
  const [findGroup, setFindGroup] = useState('');
  const [findLeader, setFindLeader] = useState('');
  const [findPassword, setFindPassword] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !leaderName.trim()) {
      showToast('그룹 이름과 리더 이름을 모두 입력해 주세요.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const isDuplicate = await checkGroupDuplicate(groupName, leaderName);
      if (isDuplicate) {
        showToast('이미 동일한 이름의 그룹과 리더가 존재합니다. 다른 이름을 사용해 주세요.', 'error');
        setLoading(false);
        return;
      }

      const generatedPassword = generateAdminPassword();
      const groupId = await createGroup(groupName, leaderName, generatedPassword);
      
      showToast('마니또 그룹이 성공적으로 생성되었습니다!', 'success');
      onNavigate('register', groupId);
    } catch (err) {
      console.error(err);
      showToast('그룹 생성에 실패했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findGroup.trim() || !findLeader.trim() || !findPassword.trim()) {
      showToast('모든 정보를 입력해 주세요.', 'warning');
      return;
    }

    try {
      const group = await findGroupForAdmin(findGroup, findLeader, findPassword);
      if (group) {
        showToast('그룹 조회가 성공했습니다!', 'success');
        if (group.isMatched) {
          onNavigate('admin', group.id);
        } else {
          onNavigate('register', group.id);
        }
      } else {
        showToast('그룹 정보 또는 비밀번호가 일치하지 않습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('그룹 조회 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-fade-up">
      {/* DB Connection Badge */}
      <div className="flex justify-center mb-6">
        {isFirebaseConfigured ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="w-3.5 h-3.5" />
            <span>실시간 Firebase 클라우드 연결됨</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>로컬 모드 (브라우저 저장소 작동 중)</span>
          </div>
        )}
      </div>

      {/* Main Title card */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4 shadow-glow-gold">
          <Award className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white mb-2">
          마니또 메이커
        </h1>
        <p className="text-slate-400 text-sm">
          그룹을 생성하고 설레는 마니또 추첨을 시작하세요!
        </p>
      </div>

      {/* Glass Container */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-card-premium">
        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>새 그룹 만들기</span>
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'find'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>기존 그룹 관리</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  그룹 이름
                </label>
                <input
                  type="text"
                  placeholder="예: 2026 연말 파티, 우리 가족 마니또"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  방장(리더) 이름
                </label>
                <input
                  type="text"
                  placeholder="본인의 이름을 입력하세요"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  maxLength={15}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-glow-gold flex items-center justify-center gap-2 cursor-pointer mt-6 text-sm"
              >
                <Users className="w-4 h-4" />
                <span>{loading ? '그룹 생성 중...' : '그룹 생성 & 멤버 등록'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleFind} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  그룹 이름
                </label>
                <input
                  type="text"
                  placeholder="조회할 그룹 이름을 입력하세요"
                  value={findGroup}
                  onChange={(e) => setFindGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  방장(리더) 이름
                </label>
                <input
                  type="text"
                  placeholder="방장 이름을 입력하세요"
                  value={findLeader}
                  onChange={(e) => setFindLeader(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  방장 비밀번호
                </label>
                <input
                  type="text"
                  placeholder="예: 행복한 사자 (형용사 동물 조합)"
                  value={findPassword}
                  onChange={(e) => setFindPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  maxLength={30}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 cursor-pointer mt-6 text-sm"
              >
                <Search className="w-4 h-4" />
                <span>그룹 찾기</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
