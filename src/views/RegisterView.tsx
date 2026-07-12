import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Edit2, Play, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { getGroup, updateGroupNames, saveGroupMatches } from '../services/groupService';
import type { GroupData } from '../services/groupService';
import { performCyclicMatching } from '../utils/matching';

interface RegisterViewProps {
  groupId: string;
  onNavigate: (view: string, groupId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function RegisterView({ groupId, onNavigate, showToast }: RegisterViewProps) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Name input states
  const [inputName, setInputName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadGroup() {
      try {
        const data = await getGroup(groupId);
        if (data) {
          setGroup(data);
          setNames(data.names || []);
          if (data.isMatched) {
            // If already matched, redirect to admin dashboard
            showToast('이미 매칭이 완료된 그룹입니다. 관리 페이지로 이동합니다.', 'info');
            onNavigate('admin', groupId);
          }
        } else {
          showToast('그룹을 찾을 수 없습니다.', 'error');
          onNavigate('home', '');
        }
      } catch (err) {
        console.error(err);
        showToast('그룹 정보를 불러오는 데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadGroup();
  }, [groupId]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = inputName.trim();
    if (!cleanName) return;

    if (editingIndex !== null) {
      // Editing mode
      const isDuplicate = names.some(
        (n, idx) => n.toLowerCase() === cleanName.toLowerCase() && idx !== editingIndex
      );
      if (isDuplicate) {
        showToast('이미 그룹에 등록된 이름입니다.', 'error');
        return;
      }
      const updated = [...names];
      updated[editingIndex] = cleanName;
      setNames(updated);
      setInputName('');
      setEditingIndex(null);
      await syncNames(updated);
      showToast('참가자 이름이 수정되었습니다.', 'success');
    } else {
      // Adding mode
      const isDuplicate = names.some((n) => n.toLowerCase() === cleanName.toLowerCase());
      if (isDuplicate) {
        showToast('이미 그룹에 등록된 이름입니다.', 'error');
        return;
      }
      const updated = [...names, cleanName];
      setNames(updated);
      setInputName('');
      await syncNames(updated);
      showToast(`${cleanName}님이 추가되었습니다.`, 'success');
    }
  };

  const syncNames = async (updatedNames: string[]) => {
    try {
      await updateGroupNames(groupId, updatedNames);
    } catch (err) {
      console.error('Failed to sync names:', err);
      showToast('이름 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (index: number) => {
    const nameToRemove = names[index];
    const updated = names.filter((_, i) => i !== index);
    setNames(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setInputName('');
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    await syncNames(updated);
    showToast(`${nameToRemove}님이 삭제되었습니다.`, 'success');
  };

  const handleEdit = (index: number) => {
    setInputName(names[index]);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setInputName('');
    setEditingIndex(null);
  };

  const handleMatch = async () => {
    if (names.length < 3) {
      showToast('마니또를 시작하려면 최소 3명 이상의 멤버가 필요합니다.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Perform cyclic matching algorithm
      const matchedPairs = performCyclicMatching(names);
      await saveGroupMatches(groupId, matchedPairs);
      showToast('축하합니다! 마니또 매칭이 완료되었습니다! 🎉', 'success');
      onNavigate('admin', groupId);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || '매칭 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">그룹 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-fade-up">
      {/* Back button */}
      <button
        onClick={() => onNavigate('home', '')}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>처음으로</span>
      </button>

      {/* Admin Password banner */}
      <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-left">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              방장 전용 관리 비밀번호
            </h4>
            <p className="text-lg font-extrabold text-white tracking-wide mb-1">
              {group.password}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              이 비밀번호는 리더가 결과를 확인하거나 참가자들의 비밀번호를 재조회할 때 필요합니다. 안전한 곳에 적어두세요!
            </p>
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold text-white mb-1">
          {group.groupName}
        </h2>
        <p className="text-slate-400 text-xs">
          리더: <span className="text-slate-300 font-medium">{group.leaderName}</span> · 멤버 등록 중
        </p>
      </div>

      {/* Main Form Box */}
      <div className="glass-card rounded-2xl p-6 shadow-card-premium mb-6">
        <form onSubmit={handleAddOrUpdate} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="참가자 이름을 입력하세요"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
            maxLength={15}
          />
          {editingIndex !== null ? (
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                수정
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 rounded-xl text-xs border border-slate-700 cursor-pointer"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer flex items-center justify-center"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Member list section */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-slate-400 text-xs font-semibold tracking-wider">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>등록된 멤버 ({names.length}명)</span>
            </span>
            {names.length < 3 && (
              <span className="text-amber-500/80 flex items-center gap-1 text-[10px]">
                <AlertCircle className="w-3 h-3" />
                <span>최소 3명 필요</span>
              </span>
            )}
          </div>

          {names.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">
              아직 등록된 멤버가 없습니다.<br />위의 입력창에서 이름을 추가해 주세요.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-900/50 pr-1">
              {names.map((name, index) => (
                <div key={index} className="flex items-center justify-between py-2.5 group">
                  <span className="text-sm font-medium text-slate-200">{name}</span>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(index)}
                      className="p-1.5 hover:text-amber-400 text-slate-400 transition-colors cursor-pointer"
                      title="이름 수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-1.5 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                      title="이름 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Match Trigger Button */}
      <button
        onClick={handleMatch}
        disabled={names.length < 3 || submitting}
        className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold py-4 px-4 rounded-xl transition-all shadow-glow-gold flex items-center justify-center gap-2 cursor-pointer mt-4 text-sm"
      >
        <Play className="w-4 h-4 fill-slate-950" />
        <span>{submitting ? '매칭 추첨 중...' : '마니또 매칭 시작하기'}</span>
      </button>
    </div>
  );
}
