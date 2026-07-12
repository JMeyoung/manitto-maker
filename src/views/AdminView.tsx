import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, Share2, ArrowLeft, ExternalLink, Settings } from 'lucide-react';
import { getGroup } from '../services/groupService';
import type { GroupData } from '../services/groupService';

interface AdminViewProps {
  groupId: string;
  onNavigate: (view: string, groupId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function AdminView({ groupId, onNavigate, showToast }: AdminViewProps) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullResults, setShowFullResults] = useState(false);
  
  // Kakao SDK integration state
  const [kakaoKey, setKakaoKey] = useState(() => localStorage.getItem('kakao_app_key') || '');
  const [isKakaoInitialized, setIsKakaoInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function loadGroup() {
      try {
        const data = await getGroup(groupId);
        if (data) {
          setGroup(data);
          if (!data.isMatched) {
            showToast('아직 마니또 매칭이 진행되지 않았습니다.', 'warning');
            onNavigate('register', groupId);
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

  useEffect(() => {
    // Check if Kakao is already initialized
    const Kakao = (window as any).Kakao;
    if (Kakao && Kakao.isInitialized()) {
      setIsKakaoInitialized(true);
    } else if (Kakao && kakaoKey.trim()) {
      try {
        Kakao.init(kakaoKey.trim());
        setIsKakaoInitialized(true);
      } catch (err) {
        console.error('Failed to init Kakao SDK:', err);
      }
    }
  }, [kakaoKey]);

  const handleInitKakao = (e: React.FormEvent) => {
    e.preventDefault();
    const Kakao = (window as any).Kakao;
    if (!Kakao) {
      showToast('카카오 SDK가 웹페이지에 정상적으로 로드되지 않았습니다.', 'error');
      return;
    }

    if (!kakaoKey.trim()) {
      showToast('앱 키를 입력해 주세요.', 'warning');
      return;
    }

    try {
      if (Kakao.isInitialized()) {
        showToast('이미 카카오 SDK가 초기화되어 있습니다.', 'info');
        return;
      }
      Kakao.init(kakaoKey.trim());
      localStorage.setItem('kakao_app_key', kakaoKey.trim());
      setIsKakaoInitialized(true);
      showToast('카카오톡 공유가 활성화되었습니다!', 'success');
      setShowSettings(false);
    } catch (err) {
      console.error(err);
      showToast('카카오 SDK 초기화에 실패했습니다. 키를 확인해 주세요.', 'error');
    }
  };

  const getRevealUrl = () => {
    return `${window.location.origin}${window.location.pathname}?view=reveal&groupId=${groupId}`;
  };

  const getIndividualRevealUrl = (giver: string) => {
    return `${getRevealUrl()}&name=${encodeURIComponent(giver)}`;
  };

  const copyOverallLink = () => {
    const url = getRevealUrl();
    navigator.clipboard.writeText(url);
    showToast('결과 확인 페이지 링크가 클립보드에 복사되었습니다!', 'success');
  };

  const copyIndividualShareText = (giver: string, password: string) => {
    const individualUrl = getIndividualRevealUrl(giver);
    const text = `✨ [${group?.groupName}] 마니또 매칭 결과가 도착했습니다! ✨

🎁 ${giver}님, 아래 링크를 눌러 비밀번호를 입력하고 마니또를 확인하세요!

🔗 링크: ${individualUrl}
🔑 확인 비밀번호: ${password}

※ 다른 사람에게 유출되지 않도록 주의하세요!`;

    navigator.clipboard.writeText(text);
    showToast(`${giver}님의 결과 확인 안내 메시지가 복사되었습니다!`, 'success');
  };

  const handleKakaoShare = (giverName?: string, password?: string) => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      showToast('카카오 공유를 활성화하려면 아래 설정에서 JavaScript App Key를 등록해 주세요.', 'warning');
      setShowSettings(true);
      return;
    }

    const revealUrl = getRevealUrl();
    const title = `✨ [${group?.groupName}] 마니또 결과 확인!`;
    const description = giverName 
      ? `🎁 ${giverName}님의 마니또 비밀번호는 "${password}" 입니다! 지금 접속해서 결과를 확인하세요!`
      : `🎁 ${group?.leaderName}님이 보낸 마니또 매칭 결과가 나왔습니다! 각자의 이름과 비밀번호를 입력하고 바로 확인해 보세요!`;

    const shareConfig = {
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
        link: {
          mobileWebUrl: revealUrl,
          webUrl: revealUrl,
        },
      },
      buttons: [
        {
          title: '내 결과 확인하기',
          link: {
            mobileWebUrl: giverName ? getIndividualRevealUrl(giverName) : revealUrl,
            webUrl: giverName ? getIndividualRevealUrl(giverName) : revealUrl,
          },
        },
      ],
    };

    try {
      if (Kakao.Share) {
        Kakao.Share.sendDefault(shareConfig);
      } else if (Kakao.Link) {
        Kakao.Link.sendDefault(shareConfig);
      }
      showToast('카카오톡 공유창이 열렸습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast('카카오톡 공유 중 오류가 발생했습니다.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">매칭 결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-md w-full mx-auto px-4 py-8 animate-fade-up">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate('home', '')}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>처음으로</span>
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            showSettings 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
              : 'border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-300'
          }`}
          title="카카오 설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Kakao Settings Collapsible Panel */}
      {showSettings && (
        <div className="mb-6 p-5 rounded-xl bg-slate-900/50 border border-slate-800 animate-fade-in text-left">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
            <span>💬 카카오톡 공유 기능 설정</span>
            {isKakaoInitialized && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                활성화됨
              </span>
            )}
          </h4>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            카카오 developers 웹사이트에서 발급받은 <b>JavaScript App Key</b>를 등록하시면, 웹앱에서 바로 참가자들에게 카카오톡 결과 링크를 바로 전송할 수 있습니다. (공란일 경우 일반 링크 복사로만 작동합니다.)
          </p>
          <form onSubmit={handleInitKakao} className="flex gap-2">
            <input
              type="password"
              placeholder="JavaScript 키를 입력하세요"
              value={kakaoKey}
              onChange={(e) => setKakaoKey(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
            >
              등록
            </button>
          </form>
        </div>
      )}

      {/* Header Info */}
      <div className="text-center mb-6">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
          방장 관리 모드
        </span>
        <h2 className="font-display text-2xl font-bold text-white mt-2 mb-1">
          {group.groupName}
        </h2>
        <p className="text-slate-400 text-xs">
          리더: <span className="text-slate-300 font-medium">{group.leaderName}</span> · 마니또 결과 조회
        </p>
      </div>

      {/* Sharing controls block */}
      <div className="glass-card rounded-2xl p-5 mb-6 text-left border-l-4 border-l-amber-500">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
          <span>📢 공용 결과 확인 페이지 공유</span>
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed mb-4">
          참가자들에게 아래 확인 페이지 링크를 전송하세요. 참가자들은 이 링크에 접속해 각자의 이름과 4자리 비밀번호를 입력하고 마니또 대상을 확인할 수 있습니다.
        </p>
        <div className="flex gap-2">
          <button
            onClick={copyOverallLink}
            className="flex-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold py-2.5 px-3 rounded-xl border border-slate-700 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>결과 확인 링크 복사</span>
          </button>
          <button
            onClick={() => handleKakaoShare()}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>카톡으로 전체 공유</span>
          </button>
        </div>
      </div>

      {/* Matches Listing Card */}
      <div className="glass-card rounded-2xl p-6 shadow-card-premium">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            매칭 결과 리스트
          </span>
          <button
            onClick={() => setShowFullResults(!showFullResults)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              showFullResults
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {showFullResults ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>결과 숨기기</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>전체 결과 보기 (방장용)</span>
              </>
            )}
          </button>
        </div>

        {/* Matches Rows */}
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {group.matches.map((match, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-900 bg-slate-950/40 hover:bg-slate-950/80 transition-colors flex items-center justify-between text-left"
            >
              <div className="space-y-1">
                {showFullResults ? (
                  <div className="text-sm font-semibold text-slate-200">
                    <span className="text-amber-400">{match.giver}</span>
                    <span className="text-slate-500 mx-2">➞</span>
                    <span className="text-teal-400">{match.receiver}</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-200">
                    <span>{match.giver}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 font-mono">
                  확인 비밀번호: <span className="text-slate-300 font-semibold">{match.password}</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => copyIndividualShareText(match.giver, match.password)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="안내 메시지 복사"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleKakaoShare(match.giver, match.password)}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="카카오톡으로 공유"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participant Reveal Direct Access Link */}
      <div className="mt-6 text-center">
        <a
          href={getRevealUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 transition-colors font-medium border-b border-amber-500/20 pb-0.5 hover:border-amber-400"
        >
          <span>참가자 결과 확인 페이지 테스트하기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
