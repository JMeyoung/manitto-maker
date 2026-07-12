import React, { useState, useEffect } from 'react';
import { Gift, Lock, Check, EyeOff, Sparkles } from 'lucide-react';
import { getGroup } from '../services/groupService';
import type { GroupData } from '../services/groupService';
import confetti from 'canvas-confetti';

interface RevealViewProps {
  groupId: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function RevealView({ groupId, showToast }: RevealViewProps) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedName, setSelectedName] = useState('');
  const [password, setPassword] = useState('');
  
  // Reveal status
  const [revealedReceiver, setRevealedReceiver] = useState<string | null>(null);
  const [isShakeActive, setIsShakeActive] = useState(false);

  useEffect(() => {
    // Read name from URL parameter if pre-filled
    const params = new URLSearchParams(window.location.search);
    const prefilledName = params.get('name');

    async function loadGroup() {
      try {
        const data = await getGroup(groupId);
        if (data) {
          setGroup(data);
          if (prefilledName && data.names.includes(prefilledName)) {
            setSelectedName(prefilledName);
          }
        } else {
          showToast('그룹을 찾을 수 없습니다.', 'error');
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

  const triggerConfetti = () => {
    // A nice multi-burst confetti animation
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#fbbf24', '#f59e0b', '#aa3bff', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#fbbf24', '#f59e0b', '#aa3bff', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  const handleReveal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName) {
      showToast('이름을 선택해 주세요.', 'warning');
      return;
    }
    if (!password.trim()) {
      showToast('비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    if (!group || !group.matches) return;

    // Find match matching the giver
    const match = group.matches.find(
      (m) => m.giver.toLowerCase() === selectedName.toLowerCase()
    );

    if (match && match.password === password.trim()) {
      setRevealedReceiver(match.receiver);
      showToast('마니또 확인에 성공했습니다!', 'success');
      triggerConfetti();
    } else {
      showToast('비밀번호가 일치하지 않습니다. 다시 입력해 주세요.', 'error');
      setIsShakeActive(true);
      setTimeout(() => setIsShakeActive(false), 500); // clear shake animation
    }
  };

  const handleCloseReveal = () => {
    setRevealedReceiver(null);
    setPassword('');
    showToast('보안을 위해 결과 창을 닫았습니다.', 'info');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">그룹 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-md w-full mx-auto px-4 py-8 text-center animate-fade-up">
        <div className="glass-card rounded-2xl p-8 shadow-card-premium">
          <p className="text-slate-400 text-sm mb-4">존재하지 않거나 불러올 수 없는 그룹입니다.</p>
          <a
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-sm"
          >
            홈으로 가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-fade-up">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 shadow-glow-purple">
          <Gift className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-1">
          {group.groupName}
        </h2>
        <p className="text-slate-400 text-xs">
          방장: <span className="text-slate-300 font-medium">{group.leaderName}</span> · 마니또 확인
        </p>
      </div>

      {/* Glass card container */}
      <div 
        className={`glass-card rounded-3xl overflow-hidden shadow-card-premium p-6 transition-all ${
          isShakeActive ? 'animate-shake' : ''
        }`}
      >
        {revealedReceiver ? (
          /* REVEALED RESULTS SCREEN */
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="inline-flex p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {selectedName}님의 마니또 대상은
              </p>
              <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent py-2">
                <span className="font-display text-4xl font-extrabold tracking-tight">
                  {revealedReceiver}
                </span>
                <span className="text-white text-2xl font-bold ml-1">님</span>
              </div>
              <p className="text-xs text-slate-400">입니다! 🎁</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900/50 text-slate-300 text-xs leading-relaxed max-w-[280px] mx-auto">
              상대방이 모르게 몰래 선물을 준비하고 따뜻한 마음을 전달해 보세요. 쉿! 마니또는 비밀입니다! 😉
            </div>

            <button
              onClick={handleCloseReveal}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors text-xs cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
            >
              <EyeOff className="w-4 h-4" />
              <span>결과 숨기기 (보안 유지)</span>
            </button>
          </div>
        ) : (
          /* PASSWORD VERIFY INPUT SCREEN */
          <form onSubmit={handleReveal} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-left">
                내 이름 선택
              </label>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm cursor-pointer"
              >
                <option value="">-- 이름을 선택하세요 --</option>
                {group.names.map((name, idx) => (
                  <option key={idx} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-left">
                4자리 확인 비밀번호
              </label>
              <input
                type="password"
                placeholder="발급받은 4자리 번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm text-center font-mono tracking-widest"
                maxLength={4}
                pattern="\d{4}"
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-glow-purple flex items-center justify-center gap-2 cursor-pointer mt-8 text-sm"
            >
              <Check className="w-4 h-4" />
              <span>마니또 확인하기</span>
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-slate-900/30 border border-slate-900 text-left">
        <h4 className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>결과 확인 도움말</span>
        </h4>
        <p className="text-slate-500 text-[10px] leading-relaxed">
          본인의 이름과 방장에게 전달받은 4자리 비밀번호를 입력해 마니또 대상을 볼 수 있습니다. 확인 후에는 옆 사람에게 보이지 않게 즉시 '결과 숨기기' 버튼을 눌러주세요.
        </p>
      </div>
    </div>
  );
}
