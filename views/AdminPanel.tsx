import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadFile } from '../services/supabase';
import { uploadLessonVideoToBunny } from '../services/bunnyVideoService';
import { 
    Plus, Loader2, Trash2, Video, Upload, Shield, Lock, Unlock,
    Edit2, X, Search, Calendar, Sparkles, Users, BookOpen,
    CheckCircle, XCircle, ChevronLeft, FileText, Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { type User, Role, type ScheduleEvent, type CourseYearTier, COURSE_YEAR_LABELS, normalizeCourseYearTier } from '../types';
import { AccessGate } from '../components/AccessGate';
import { useToast } from '../contexts/ToastContext';
import { fetchPendingShowcasePosts, moderatePost, deleteShowcasePost, mediaPublicUrl, type ShowcasePostRow } from '../services/projectShowcaseService';
import { showcasePostBody, type PhraseSelections, type MediaItem } from '../data/projectShowcaseCatalog';
import { resolveBundledOrDefault } from '../data/defaultAvatars';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

type AdminView = 'content' | 'users' | 'schedule' | 'showcase' | 'homework';

// --- Types ---
type HomeworkLessonEmbed = {
    title: string | null;
    homework_task: string | null;
    modules?: {
        title: string | null;
        courses?: { title: string | null } | { title: string | null }[] | null;
    } | { title: string | null; courses?: { title: string | null } | { title: string | null }[] | null }[] | null;
};

type HomeworkSubmissionRow = {
    id: string;
    user_id: string;
    lesson_id: string;
    submitted_at: string;
    status: 'pending' | 'approved' | 'rejected';
    answer: string | null;
    attachments: any;
    admin_comment: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    lessons?: HomeworkLessonEmbed | HomeworkLessonEmbed[] | null;
};

function firstOf<T>(x: T | T[] | null | undefined): T | null {
    if (x == null) return null;
    return Array.isArray(x) ? (x[0] ?? null) : x;
}

function homeworkLessonContext(s: HomeworkSubmissionRow): { path: string; homeworkTask: string | null; } | null {
    const lesson = firstOf(s.lessons);
    if (!lesson) return null;
    const mod = firstOf(lesson.modules);
    const course = firstOf(mod?.courses);
    const courseTitle = (course?.title || '').trim() || 'Курс';
    const moduleTitle = (mod?.title || '').trim() || 'Модуль';
    const lessonTitle = (lesson.title || '').trim() || 'Урок';
    const path = `${courseTitle} → ${moduleTitle} → ${lessonTitle}`;
    const homeworkTask = typeof lesson.homework_task === 'string' ? lesson.homework_task.trim() : null;
    return { path, homeworkTask: homeworkTask && homeworkTask.length > 0 ? homeworkTask : null };
}

function safeShowcaseBody(sel: unknown): string {
    try {
        if (!sel || typeof sel !== 'object') return 'Без описания';
        return showcasePostBody(sel as PhraseSelections) || 'Без описания';
    } catch (e) {
        console.warn('[Admin] showcase body', e);
        return 'Без описания';
    }
}

// --- Components ---
const IslandStats = ({ usersCount, showcaseCount, homeworkCount }: { usersCount: number, showcaseCount: number, homeworkCount: number }) => {
    const [expanded, setExpanded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
            width: expanded ? 300 : 120,
            height: expanded ? 140 : 40,
            borderRadius: expanded ? 24 : 20,
            duration: 0.6,
            ease: 'elastic.out(1, 0.7)',
        });
        
        if (expanded) {
            gsap.to('.stats-compact', { autoAlpha: 0, duration: 0.2 });
            gsap.to('.stats-expanded', { autoAlpha: 1, duration: 0.4, delay: 0.1, stagger: 0.05 });
        } else {
            gsap.to('.stats-expanded', { autoAlpha: 0, duration: 0.2 });
            gsap.to('.stats-compact', { autoAlpha: 1, duration: 0.4, delay: 0.2 });
        }
    }, [expanded]);

    return (
        <div 
            ref={ref}
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer bg-black/90 backdrop-blur-xl border border-white/10 shadow-island overflow-hidden relative mx-auto mb-6 z-40"
            style={{ width: 120, height: 40, borderRadius: 20 }}
        >
            <div className="stats-compact absolute inset-0 flex items-center justify-center gap-2 text-white text-xs font-bold">
                <Shield size={14} className="text-kiddy-cherry" />
                <span>Статистика</span>
            </div>
            <div className="stats-expanded absolute inset-0 p-4 opacity-0 flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Пользователи</span>
                    <span className="text-white font-bold">{usersCount}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-xs uppercase tracking-widest font-bold">На проверке (ДЗ)</span>
                    <span className="text-white font-bold">{homeworkCount}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Витрина (Ожидают)</span>
                    <span className="text-white font-bold">{showcaseCount}</span>
                </div>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [currentView, setCurrentView] = useState<AdminView>('content');
    const [courses, setCourses] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [showcasePosts, setShowcasePosts] = useState<ShowcasePostRow[]>([]);
    const [showcaseAuthors, setShowcaseAuthors] = useState<Record<string, string>>({});
    const [homeworkQueue, setHomeworkQueue] = useState<HomeworkSubmissionRow[]>([]);
    const [homeworkAuthors, setHomeworkAuthors] = useState<Record<string, { name: string; avatar?: string | null }>>({});
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);

    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [activeCourse, setActiveCourse] = useState<any | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Form States
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseForm, setCourseForm] = useState<{ title: string; description: string; cover_image: string; id: string; year_tier: CourseYearTier; }>({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' });
    
    const [lessonModalOpen, setLessonModalOpen] = useState(false);
    const [lessonForm, setLessonForm] = useState({ title: '', description: '', video_url: '', homework_task: '', module_id: '', id: '' });
    
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', course_id: '', id: '' });

    const [scheduleForm, setScheduleForm] = useState({ day_of_week: 1, time_start: '10:00', time_end: '11:00', title: '', description: '', location: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const lessonVideoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentView === 'content') fetchContent();
        else if (currentView === 'users') fetchUsers();
        else if (currentView === 'schedule') fetchSchedule();
        else if (currentView === 'showcase') fetchShowcaseModeration();
        else if (currentView === 'homework') fetchHomeworkQueue();
    }, [currentView]);

    // --- Data Fetching ---
    const fetchContent = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('courses').select('*, modules(*, lessons(*))').order('created_at', { ascending: false });
            if (error) throw error;
            
            const coursesWithContent = (data || []).map((course: any) => {
                const sortedModules = (course.modules || []).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()).map((module: any) => ({
                    ...module,
                    lessons: (module.lessons || []).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
                }));
                return { ...course, modules: sortedModules };
            });
            
            setCourses(coursesWithContent);
            if (activeCourse) {
                const updatedActive = coursesWithContent.find(c => c.id === activeCourse.id);
                if (updatedActive) setActiveCourse(updatedActive);
            }
        } catch (e) {
            showToast('Ошибка загрузки курсов', 'error');
        } finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_all_users');
            if (!rpcError && Array.isArray(rpcUsers)) {
                setUsersList(rpcUsers.map((u: any) => ({
                    id: u.id, email: u.email || '', name: u.name || 'Аноним', role: u.role || 'Student',
                    avatar: resolveBundledOrDefault(u.id, u.avatar), level: u.level || 1, xp: u.xp || 0, isApproved: u.is_approved === true
                })));
            } else {
                const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
                if (profilesError) throw profilesError;
                if (profilesData) {
                    setUsersList(profilesData.map((u: any) => ({
                        id: u.id, email: u.email || '', name: u.name || 'Аноним', role: u.role || 'Student',
                        avatar: resolveBundledOrDefault(u.id, u.avatar), level: u.level || 0, xp: u.xp || 0, isApproved: u.is_approved === true
                    })));
                } else {
                    setUsersList([]);
                }
            }
        } catch (e) {
            showToast('Ошибка загрузки пользователей', 'error');
        } finally { setLoading(false); }
    };

    const fetchShowcaseModeration = async () => {
        setLoading(true);
        try {
            const posts = await fetchPendingShowcasePosts();
            const ids = [...new Set(posts.map((p) => p.author_id))];
            const map: Record<string, string> = {};
            if (ids.length > 0) {
                const { data } = await supabase.from('profiles').select('id, name').in('id', ids);
                (data || []).forEach((p: any) => { map[p.id] = p.name?.trim() || 'Ученик'; });
            }
            setShowcaseAuthors(map);
            setShowcasePosts(posts);
        } catch (e) {
            showToast('Ошибка загрузки витрины', 'error');
        } finally { setLoading(false); }
    };

    const fetchHomeworkQueue = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('homework_submissions').select(`id,user_id,lesson_id,submitted_at,status,answer,attachments,admin_comment,reviewed_by,reviewed_at,lessons ( title, homework_task, modules ( title, courses ( title ) ) )`).eq('status', 'pending').order('submitted_at', { ascending: false }).limit(200);
            if (error) throw error;
            setHomeworkQueue((data || []) as HomeworkSubmissionRow[]);
            const ids = [...new Set((data || []).map((r: any) => r.user_id))];
            const map: Record<string, any> = {};
            if (ids.length > 0) {
                const { data: profs } = await supabase.from('profiles').select('id,name,avatar').in('id', ids);
                (profs || []).forEach((p: any) => { map[p.id] = { name: p.name?.trim() || 'Ученик', avatar: p.avatar }; });
            }
            setHomeworkAuthors(map);
        } catch (e) {
            showToast('Ошибка загрузки ДЗ', 'error');
        } finally { setLoading(false); }
    };

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('schedule_events').select('*').order('day_of_week').order('time_start');
            if (!error) setScheduleEvents(data || []);
        } finally { setLoading(false); }
    };

    // --- Upload ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'course' | 'lesson') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            if (target === 'lesson') {
                showToast('Загрузка видео в Bunny...', 'info');
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) {
                    showToast('Нужна авторизация', 'error');
                    return;
                }
                // Лимит ~1.5 GB — предупреждение для очень больших файлов
                if (file.size > 1500 * 1024 * 1024) {
                    showToast('Файл слишком большой (макс. ~1.5 GB)', 'error');
                    return;
                }
                const bunnyUrl = await uploadLessonVideoToBunny(file, token);
                setLessonForm(prev => ({ ...prev, video_url: bunnyUrl }));
                showToast('Видео загружено (Bunny)', 'success');
            } else {
                showToast('Загрузка файла...', 'info');
                const url = await uploadFile(file, 'covers');
                if (url) {
                    setCourseForm(prev => ({ ...prev, cover_image: url }));
                    showToast('Файл загружен', 'success');
                } else {
                    showToast('Не удалось загрузить обложку', 'error');
                }
            }
        } catch (error) {
            console.error('[Admin] upload', error);
            showToast(error instanceof Error ? error.message : 'Ошибка загрузки', 'error');
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    // --- Course CRUD ---
    const saveCourse = async () => {
        if (!courseForm.title) return showToast('Введите название', 'error');
        setLoading(true);
        try {
            if (courseForm.id) {
                await supabase.from('courses').update({ title: courseForm.title, description: courseForm.description, cover_image: courseForm.cover_image, year_tier: courseForm.year_tier }).eq('id', courseForm.id);
                showToast('Курс обновлен', 'success');
            } else {
                await supabase.from('courses').insert({ title: courseForm.title, description: courseForm.description, cover_image: courseForm.cover_image, type: 'Course', year_tier: courseForm.year_tier });
                showToast('Курс создан', 'success');
            }
            setCourseModalOpen(false);
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    const deleteCourse = async (id: string) => {
        if (!window.confirm('Удалить курс со всеми модулями и уроками?')) return;
        setLoading(true);
        try {
            await supabase.from('courses').delete().eq('id', id);
            showToast('Курс удален', 'success');
            setActiveCourse(null);
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    // --- Module CRUD ---
    const saveModule = async () => {
        if (!moduleForm.title) return showToast('Введите название', 'error');
        setLoading(true);
        try {
            if (moduleForm.id) {
                await supabase.from('modules').update({ title: moduleForm.title }).eq('id', moduleForm.id);
                showToast('Модуль обновлен', 'success');
            } else {
                await supabase.from('modules').insert({ title: moduleForm.title, course_id: moduleForm.course_id });
                showToast('Модуль создан', 'success');
            }
            setEditingModuleId(null);
            setModuleForm({ title: '', course_id: '', id: '' });
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    const deleteModule = async (id: string) => {
        if (!window.confirm('Удалить модуль со всеми уроками?')) return;
        setLoading(true);
        try {
            await supabase.from('modules').delete().eq('id', id);
            showToast('Модуль удален', 'success');
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    // --- Lesson CRUD ---
    const saveLesson = async () => {
        if (!lessonForm.title) return showToast('Введите название', 'error');
        setLoading(true);
        try {
            if (lessonForm.id) {
                await supabase.from('lessons').update({ title: lessonForm.title, description: lessonForm.description, video_url: lessonForm.video_url, homework_task: lessonForm.homework_task }).eq('id', lessonForm.id);
                showToast('Урок обновлен', 'success');
            } else {
                await supabase.from('lessons').insert({ title: lessonForm.title, description: lessonForm.description, video_url: lessonForm.video_url, homework_task: lessonForm.homework_task, module_id: lessonForm.module_id });
                showToast('Урок создан', 'success');
            }
            setLessonModalOpen(false);
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    const deleteLesson = async (id: string) => {
        if (!window.confirm('Удалить урок?')) return;
        setLoading(true);
        try {
            await supabase.from('lessons').delete().eq('id', id);
            showToast('Урок удален', 'success');
            fetchContent();
        } catch (e) { showToast('Ошибка', 'error'); }
        setLoading(false);
    };

    // --- Schedule CRUD ---
    const saveScheduleEvent = async () => {
        if (!scheduleForm.title.trim()) return showToast('Введите название', 'error');
        try {
            await supabase.from('schedule_events').insert({
                day_of_week: scheduleForm.day_of_week, time_start: scheduleForm.time_start, time_end: scheduleForm.time_end || null,
                title: scheduleForm.title.trim(), description: scheduleForm.description.trim() || null, location: scheduleForm.location.trim() || null
            });
            showToast('Событие добавлено', 'success');
            setScheduleForm({ day_of_week: 1, time_start: '10:00', time_end: '11:00', title: '', description: '', location: '' });
            fetchSchedule();
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    const deleteScheduleEvent = async (id: string) => {
        if (!window.confirm('Удалить событие?')) return;
        try {
            await supabase.from('schedule_events').delete().eq('id', id);
            showToast('Удалено', 'success');
            fetchSchedule();
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    // --- User Actions ---
    const toggleUserApproval = async (u: User) => {
        try {
            await supabase.from('profiles').update({ is_approved: !u.isApproved }).eq('id', u.id);
            showToast(u.isApproved ? 'Пользователь заблокирован' : 'Доступ разрешен', 'success');
            setUsersList(prev => prev.map(x => x.id === u.id ? { ...x, isApproved: !u.isApproved } : x));
            setActiveUser(null);
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    const deleteUser = async (u: User) => {
        if (u.id === user.id) return showToast('Нельзя удалить себя', 'error');
        if (!window.confirm('Точно удалить?')) return;
        try {
            await supabase.rpc('delete_user_by_admin', { target_user_id: u.id });
            setUsersList(prev => prev.filter(x => x.id !== u.id));
            showToast('Удален', 'success');
            setActiveUser(null);
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    // --- Showcase Actions ---
    const moderateShowcase = async (postId: string, approve: boolean) => {
        if (!approve && rejectReason.length < 3) return showToast('Укажите причину', 'error');
        try {
            await moderatePost(postId, approve, user.id, rejectReason || undefined);
            setShowcasePosts(prev => prev.filter(p => p.id !== postId));
            setRejectReason('');
            showToast(approve ? 'Одобрено' : 'Отклонено', 'success');
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    // --- Homework Actions ---
    const reviewHomework = async (id: string, approve: boolean) => {
        if (!approve && rejectReason.length < 3) return showToast('Укажите причину', 'error');
        try {
            await supabase.rpc('admin_review_homework', { submission_id: id, approve, comment: rejectReason || null });
            setHomeworkQueue(prev => prev.filter(x => x.id !== id));
            setRejectReason('');
            showToast(approve ? 'Принято' : 'Отклонено', 'success');
        } catch (e) { showToast('Ошибка', 'error'); }
    };

    if (user.role !== Role.ADMIN) return <AccessGate />;

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Floating Nav Island */}
            <div className="sticky top-6 z-50 flex justify-center px-4 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1 bg-black/90 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full shadow-island">
                    {(['content', 'users', 'homework', 'showcase', 'schedule'] as AdminView[]).map(v => (
                        <button
                            key={v}
                            onClick={() => setCurrentView(v)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentView === v ? 'bg-white text-black shadow-premium' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {v === 'content' ? 'Курсы' : v === 'users' ? 'Люди' : v === 'homework' ? 'ДЗ' : v === 'showcase' ? 'Витрина' : 'Календарь'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pt-12">
                <IslandStats usersCount={usersList.length} showcaseCount={showcasePosts.length} homeworkCount={homeworkQueue.length} />

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-600" size={40} /></div>
                ) : (
                    <div className="animate-fade-in-up">
                        {/* USERS VIEW */}
                        {currentView === 'users' && (
                            <div className="space-y-6">
                                <div className="relative max-w-md mx-auto">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                    <input 
                                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Поиск..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-white/30 transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {usersList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                                        <div key={u.id} onClick={() => setActiveUser(u)} className="cursor-pointer bg-white/5 border border-white/10 rounded-[2rem] p-5 flex items-center gap-4 hover:bg-white/10 transition-colors">
                                            <img src={u.avatar} className="w-14 h-14 rounded-full object-cover border border-white/10" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-bold truncate">{u.name}</h4>
                                                <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                                            </div>
                                            <div className="shrink-0">
                                                {!u.isApproved ? <Lock className="text-kiddy-cherry" size={16} /> : <CheckCircle className="text-emerald-500" size={16} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SHOWCASE VIEW */}
                        {currentView === 'showcase' && (
                            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                                {showcasePosts.length === 0 ? (
                                    <EmptyState title="Всё проверено" description="Новых проектов на витрину пока нет." icon={<Sparkles size={40} />} />
                                ) : (
                                    <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-premium relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-white/10"><div className="h-full bg-white" style={{width: '100%'}}/></div>
                                        <div className="mb-6 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center"><Users size={20} className="text-zinc-400"/></div>
                                            <div>
                                                <p className="text-white font-bold">{showcaseAuthors[showcasePosts[0].author_id] || 'Ученик'}</p>
                                                <p className="text-zinc-500 text-xs">Ожидает проверки</p>
                                            </div>
                                        </div>
                                        <p className="text-zinc-300 text-sm mb-6 whitespace-pre-wrap">{safeShowcaseBody(showcasePosts[0].phrase_selections)}</p>
                                        
                                        <textarea 
                                            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Причина отклонения..."
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm mb-6 outline-none focus:border-kiddy-cherry resize-none" rows={2}
                                        />

                                        <div className="flex gap-3">
                                            <button onClick={() => moderateShowcase(showcasePosts[0].id, false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-kiddy-cherry font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                                <XCircle size={18} /> Отклонить
                                            </button>
                                            <button onClick={() => moderateShowcase(showcasePosts[0].id, true)} className="flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                                                <CheckCircle size={18} /> Одобрить
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* HOMEWORK VIEW */}
                        {currentView === 'homework' && (
                            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                                {homeworkQueue.length === 0 ? (
                                    <EmptyState title="Очередь пуста" description="Все домашние задания проверены." icon={<FileText size={40} />} />
                                ) : (
                                    <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-premium">
                                        <div className="mb-6">
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Урок</p>
                                            <p className="text-white font-bold">{homeworkLessonContext(homeworkQueue[0])?.path || 'Неизвестный урок'}</p>
                                        </div>
                                        <div className="bg-black/40 rounded-2xl p-4 mb-6">
                                            <p className="text-zinc-400 text-xs mb-2">Ответ ученика:</p>
                                            <p className="text-white text-sm whitespace-pre-wrap">{homeworkQueue[0].answer || 'Нет текстового ответа'}</p>
                                        </div>
                                        
                                        <textarea 
                                            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Комментарий ученику..."
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm mb-6 outline-none focus:border-kiddy-cherry resize-none" rows={2}
                                        />

                                        <div className="flex gap-3">
                                            <button onClick={() => reviewHomework(homeworkQueue[0].id, false)} className="flex-1 py-4 rounded-2xl bg-white/5 text-kiddy-cherry font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                                <XCircle size={18} /> Отклонить
                                            </button>
                                            <button onClick={() => reviewHomework(homeworkQueue[0].id, true)} className="flex-1 py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                                                <CheckCircle size={18} /> Принять (+XP)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CONTENT VIEW (Visual Builder) */}
                        {currentView === 'content' && (
                            <div className="space-y-8">
                                {!activeCourse ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div onClick={() => { setCourseForm({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' }); setCourseModalOpen(true); }} className="bg-white/5 border border-white/10 border-dashed rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors min-h-[200px]">
                                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4"><Plus className="text-white" /></div>
                                            <span className="text-white font-bold">Создать курс</span>
                                        </div>
                                        {courses.map(c => (
                                            <div key={c.id} onClick={() => setActiveCourse(c)} className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden cursor-pointer hover:border-white/30 transition-colors group">
                                                {c.cover_image ? (
                                                    <img src={c.cover_image} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                                ) : (
                                                    <div className="w-full h-32 bg-zinc-900 flex items-center justify-center"><BookOpen className="text-zinc-700" size={32}/></div>
                                                )}
                                                <div className="p-5">
                                                    <h3 className="text-white font-bold text-lg mb-1">{c.title}</h3>
                                                    <p className="text-zinc-500 text-xs">{c.modules?.length || 0} модулей</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center justify-between mb-6">
                                            <button onClick={() => setActiveCourse(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                                                <ChevronLeft size={20} /> Назад к курсам
                                            </button>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setCourseForm({ id: activeCourse.id, title: activeCourse.title, description: activeCourse.description, cover_image: activeCourse.cover_image, year_tier: normalizeCourseYearTier(activeCourse.year_tier) }); setCourseModalOpen(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"><Edit2 size={16}/></button>
                                                <button onClick={() => deleteCourse(activeCourse.id)} className="p-2 bg-kiddy-cherry/10 hover:bg-kiddy-cherry/20 text-kiddy-cherry rounded-xl transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                            <h2 className="text-3xl font-display font-bold text-white mb-8">{activeCourse.title}</h2>
                                            <div className="space-y-4">
                                                {activeCourse.modules?.map((m: any, i: number) => (
                                                    <div key={m.id} className="bg-black/50 border border-white/10 rounded-3xl p-6 relative">
                                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                        
                                                        {editingModuleId === m.id ? (
                                                            <div className="ml-4 mb-4 flex gap-2">
                                                                <input value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-white/30" />
                                                                <button onClick={saveModule} className="px-4 py-2 bg-white text-black font-bold rounded-xl"><Save size={16}/></button>
                                                                <button onClick={() => setEditingModuleId(null)} className="px-4 py-2 bg-white/5 text-white font-bold rounded-xl"><X size={16}/></button>
                                                            </div>
                                                        ) : (
                                                            <div className="ml-4 mb-4 flex items-center justify-between group">
                                                                <h4 className="text-white font-bold">{m.title}</h4>
                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { setModuleForm({ id: m.id, title: m.title, course_id: m.course_id }); setEditingModuleId(m.id); }} className="text-zinc-400 hover:text-white"><Edit2 size={14}/></button>
                                                                    <button onClick={() => deleteModule(m.id)} className="text-kiddy-cherry/70 hover:text-kiddy-cherry"><Trash2 size={14}/></button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="ml-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {m.lessons?.map((l: any) => (
                                                                <div key={l.id} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between group">
                                                                    <span className="text-zinc-300 text-sm font-medium">{l.title}</span>
                                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => { setLessonForm({ id: l.id, title: l.title || '', description: l.description || '', video_url: l.video_url || '', homework_task: l.homework_task || '', module_id: l.module_id }); setLessonModalOpen(true); }} className="text-zinc-400 hover:text-white"><Edit2 size={14}/></button>
                                                                        <button onClick={() => deleteLesson(l.id)} className="text-kiddy-cherry/70 hover:text-kiddy-cherry"><Trash2 size={14}/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div onClick={() => { setLessonForm({ title: '', description: '', video_url: '', homework_task: '', module_id: m.id, id: '' }); setLessonModalOpen(true); }} className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                                                                <span className="text-zinc-400 text-sm font-bold flex items-center gap-2"><Plus size={16}/> Добавить урок</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {editingModuleId === 'new' ? (
                                                    <div className="bg-black/50 border border-white/10 rounded-3xl p-6 flex gap-2">
                                                        <input value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} placeholder="Название модуля" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-white/30" />
                                                        <button onClick={saveModule} className="px-4 py-2 bg-white text-black font-bold rounded-xl"><Save size={16}/></button>
                                                        <button onClick={() => setEditingModuleId(null)} className="px-4 py-2 bg-white/5 text-white font-bold rounded-xl"><X size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { setModuleForm({ title: '', course_id: activeCourse.id, id: '' }); setEditingModuleId('new'); }} className="w-full py-6 bg-white/5 border border-white/10 border-dashed rounded-3xl text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                                        <Plus size={20} /> Добавить модуль
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* SCHEDULE VIEW */}
                        {currentView === 'schedule' && (
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 max-w-2xl mx-auto">
                                    <h3 className="text-white font-bold mb-4">Добавить событие</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">День</label>
                                            <select value={scheduleForm.day_of_week} onChange={e => setScheduleForm({...scheduleForm, day_of_week: +e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none">
                                                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Начало</label>
                                                <input value={scheduleForm.time_start} onChange={e => setScheduleForm({...scheduleForm, time_start: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none" placeholder="10:00" />
                                            </div>
                                            <div>
                                                <label className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Конец</label>
                                                <input value={scheduleForm.time_end} onChange={e => setScheduleForm({...scheduleForm, time_end: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none" placeholder="11:00" />
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <input value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none" placeholder="Название (Урок Python)" />
                                        </div>
                                    </div>
                                    <button onClick={saveScheduleEvent} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">Добавить</button>
                                </div>

                                <div className="max-w-2xl mx-auto space-y-2">
                                    {scheduleEvents.map(ev => (
                                        <div key={ev.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <span className="text-zinc-500 font-bold mr-3">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][ev.day_of_week - 1]}</span>
                                                <span className="text-white font-bold mr-3">{ev.time_start} - {ev.time_end}</span>
                                                <span className="text-zinc-300">{ev.title}</span>
                                            </div>
                                            <button onClick={() => deleteScheduleEvent(ev.id)} className="text-kiddy-cherry/70 hover:text-kiddy-cherry"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeUser && (
                <Modal isOpen={true} onClose={() => setActiveUser(null)} maxWidth="max-w-md" panelClassName="!rounded-t-[2.5rem] md:!rounded-[2.5rem] !bg-[#111] shadow-premium">
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-8">
                            <img src={activeUser.avatar} className="w-16 h-16 rounded-full object-cover border border-white/10" alt="" />
                            <div>
                                <h3 className="text-xl font-bold text-white">{activeUser.name}</h3>
                                <p className="text-zinc-500 text-sm">{activeUser.email}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => toggleUserApproval(activeUser)} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                                {activeUser.isApproved ? <Lock size={18} className="text-zinc-400"/> : <Unlock size={18} className="text-emerald-500"/>}
                                {activeUser.isApproved ? 'Заблокировать доступ' : 'Разблокировать'}
                            </button>
                            <button onClick={() => deleteUser(activeUser)} className="w-full py-4 rounded-2xl bg-kiddy-cherry/10 border border-kiddy-cherry/20 text-kiddy-cherry font-bold hover:bg-kiddy-cherry/20 transition-colors flex items-center justify-center gap-2">
                                <Trash2 size={18} /> Удалить пользователя
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {courseModalOpen && (
                <Modal isOpen={true} onClose={() => setCourseModalOpen(false)} maxWidth="max-w-lg" panelClassName="!rounded-t-[2.5rem] md:!rounded-[2.5rem] !bg-[#111] shadow-premium">
                    <div className="p-6 space-y-4">
                        <h3 className="text-xl font-bold text-white mb-4">{courseForm.id ? 'Редактировать курс' : 'Новый курс'}</h3>
                        <input value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} placeholder="Название" className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none" />
                        <textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} placeholder="Описание" rows={3} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none resize-none" />
                        <div className="flex gap-2">
                            {(['year_1', 'year_2_plus'] as const).map((tier) => (
                                <button key={tier} onClick={() => setCourseForm({ ...courseForm, year_tier: tier })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${courseForm.year_tier === tier ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>
                                    {COURSE_YEAR_LABELS[tier]}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={courseForm.cover_image} onChange={e => setCourseForm({...courseForm, cover_image: e.target.value})} placeholder="URL обложки" className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-white outline-none" />
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/10 rounded-xl text-white"><Upload size={18}/></button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'course')} />
                        </div>
                        <button onClick={saveCourse} className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 mt-4">Сохранить</button>
                    </div>
                </Modal>
            )}

            {lessonModalOpen && (
                <Modal isOpen={true} onClose={() => setLessonModalOpen(false)} maxWidth="max-w-lg" panelClassName="!rounded-t-[2.5rem] md:!rounded-[2.5rem] !bg-[#111] shadow-premium">
                    <div className="p-6 space-y-4">
                        <h3 className="text-xl font-bold text-white mb-4">{lessonForm.id ? 'Редактировать урок' : 'Новый урок'}</h3>
                        <input value={lessonForm.title || ''} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="Название" className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none" />
                        <textarea value={lessonForm.description || ''} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} placeholder="Описание" rows={2} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none resize-none" />
                        <div className="flex gap-2">
                            <input value={lessonForm.video_url || ''} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="bunny:lessons/... или YouTube URL" className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-white outline-none" />
                            <button type="button" onClick={() => lessonVideoInputRef.current?.click()} className="p-3 bg-white/10 rounded-xl text-white" disabled={uploading}>
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                            </button>
                            <input type="file" ref={lessonVideoInputRef} className="hidden" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={e => handleUpload(e, 'lesson')} />
                        </div>
                        {uploading && <p className="text-zinc-500 text-xs">Идёт загрузка на Bunny, не закрывайте окно…</p>}
                        <textarea value={lessonForm.homework_task || ''} onChange={e => setLessonForm({...lessonForm, homework_task: e.target.value})} placeholder="Домашнее задание" rows={3} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white outline-none resize-none" />
                        <button type="button" onClick={saveLesson} disabled={uploading} className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 mt-4 disabled:opacity-50">Сохранить</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
