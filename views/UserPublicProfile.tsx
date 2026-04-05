import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AvatarImage } from '../components/AvatarImage';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabase';
import { Role } from '../types';
import { useFriendships, friendshipStateForPair } from '../hooks/useFriendships';
import { ChevronLeft, Loader2, UserPlus, UserCheck, Clock, XCircle, Users } from 'lucide-react';

interface PublicProfileRow {
  id: string;
  name: string | null;
  avatar: string | null;
  xp: number | null;
  level: number | null;
  role: string | null;
}

function isStudentRole(role: string | null | undefined): boolean {
  return (role || '').toLowerCase() === 'student';
}

export const UserPublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const myId = user.id !== 'guest' ? user.id : undefined;
  const { rows, loading: loadingFriends, sendRequest, accept, remove } = useFriendships(myId);

  useEffect(() => {
    if (!userId) {
      setLoadError(true);
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      setLoadError(false);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, xp, level, role')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data || !isStudentRole(data.role)) {
        setProfile(null);
        setLoadError(true);
      } else {
        setProfile(data as PublicProfileRow);
      }
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const canUseFriends = user.role === Role.STUDENT && myId;

  const pairState = useMemo(() => {
    if (!myId || !userId) return { row: null, label: 'none' as const };
    return friendshipStateForPair(rows, myId, userId);
  }, [rows, myId, userId]);

  if (user.id === 'guest') {
    return <Navigate to="/" replace />;
  }

  if (userId && userId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const handleAddFriend = async () => {
    if (!userId || !canUseFriends) return;
    setActionBusy(true);
    const { error } = await sendRequest(userId);
    setActionBusy(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') showToast('Заявка уже есть', 'error');
      else showToast('Не удалось отправить заявку', 'error');
    } else showToast('Заявка отправлена', 'success');
  };

  const handleAccept = async () => {
    if (!pairState.row) return;
    setActionBusy(true);
    const { error } = await accept(pairState.row.id);
    setActionBusy(false);
    if (error) showToast('Не удалось принять заявку', 'error');
    else showToast('Теперь вы в друзьях', 'success');
  };

  const handleRemove = async () => {
    if (!pairState.row) return;
    setActionBusy(true);
    const { error } = await remove(pairState.row.id);
    setActionBusy(false);
    if (error) showToast('Не удалось обновить', 'error');
    else showToast('Готово', 'success');
  };

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? Math.floor(xp / 100) + 1;
  const avatarUrl =
    profile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'U')}&background=random`;

  return (
    <div className="space-y-8 pb-20">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-kiddy-textMuted text-sm font-bold hover:text-white transition-colors"
      >
        <ChevronLeft size={18} /> Назад
      </button>

      {loadingProfile ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-kiddy-cherry" size={40} />
        </div>
      ) : loadError || !profile ? (
        <Card className="p-10 text-center">
          <p className="text-white font-bold text-lg mb-2">Профиль недоступен</p>
          <p className="text-kiddy-textMuted text-sm mb-6">Такого ученика нет или у вас нет доступа к этой странице.</p>
          <button
            type="button"
            onClick={() => navigate('/community')}
            className="text-kiddy-cherry text-sm font-bold hover:underline"
          >
            К каталогу учеников →
          </button>
        </Card>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-kiddy-surfaceElevated/80 p-8 md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-20%,rgba(230,0,43,0.12),transparent)]" />
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-kiddy-cherry/20 blur-2xl scale-110" />
                <AvatarImage
                  src={avatarUrl}
                  name={profile.name || 'Ученик'}
                  alt=""
                  className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-2 border-white/10 object-cover shadow-2xl"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black px-3 py-1 text-[10px] font-bold text-white">
                  LVL {level}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left min-w-0">
                <p className="text-kiddy-cherry text-[10px] font-bold uppercase tracking-[0.35em] mb-2">Ученик</p>
                <h1 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight italic mb-4 break-words">
                  {profile.name || 'Ученик'}
                </h1>
                <p className="text-kiddy-textMuted text-sm font-mono mb-6">
                  {xp.toLocaleString()} <span className="text-kiddy-textSecondary">XP</span>
                </p>

                {!loadingFriends && canUseFriends && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {pairState.label === 'none' && (
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={handleAddFriend}
                        className="inline-flex items-center gap-2 rounded-xl bg-kiddy-cherry px-5 py-3 text-sm font-bold text-white shadow-lg shadow-kiddy-cherry/20 transition-all hover:bg-kiddy-cherryHover disabled:opacity-50"
                      >
                        {actionBusy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        В друзья
                      </button>
                    )}
                    {pairState.label === 'outgoing' && (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200">
                        <Clock size={16} /> Заявка отправлена
                      </span>
                    )}
                    {pairState.label === 'incoming' && pairState.row && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleAccept}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {actionBusy ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                          Принять
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleRemove}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-kiddy-textMuted hover:text-white disabled:opacity-50"
                        >
                          <XCircle size={18} /> Отклонить
                        </button>
                      </>
                    )}
                    {pairState.label === 'friends' && (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">
                          <Users size={16} /> У вас в друзьях
                        </span>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={handleRemove}
                          className="text-xs font-bold uppercase tracking-widest text-kiddy-textMuted hover:text-kiddy-cherry transition-colors"
                        >
                          Убрать из друзей
                        </button>
                      </>
                    )}
                  </div>
                )}

                {!canUseFriends && user.role !== Role.STUDENT && (
                  <p className="text-kiddy-textMuted text-xs max-w-md">
                    Добавлять в друзья могут только ученики. Вы можете просматривать профили одноклассников.
                  </p>
                )}
              </div>
            </div>
          </section>

          <Card className="p-8 border-white/[0.06]">
            <h3 className="text-white font-bold text-xs uppercase tracking-[0.3em] mb-2">О школе</h3>
            <p className="text-kiddy-textMuted text-sm leading-relaxed">
              Прогресс по курсам и достижения видны только владельцу профиля. Здесь отображаются имя, уровень и опыт —
              так одноклассники узнают друг друга в каталоге.
            </p>
          </Card>
        </>
      )}
    </div>
  );
};
