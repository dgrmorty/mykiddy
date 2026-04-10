
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { supabase, uploadFile } from '../services/supabase';
import { 
    Plus, Loader2, Trash2, Video, Upload, Shield, Lock, Unlock,
    Edit2, X, ChevronRight, ChevronDown, Search, Calendar, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User, Role, ScheduleEvent, CourseYearTier, COURSE_YEAR_LABELS, normalizeCourseYearTier } from '../types';
import { AccessGate } from '../components/AccessGate';
import { useToast } from '../contexts/ToastContext';
import { fetchPendingShowcasePosts, moderatePost, deleteShowcasePost, mediaPublicUrl, type ShowcasePostRow } from '../services/projectShowcaseService';
import { showcasePostBody, type PhraseSelections, type MediaItem } from '../data/projectShowcaseCatalog';
import { resolveBundledOrDefault } from '../data/defaultAvatars';

type AdminView = 'content' | 'users' | 'schedule' | 'showcase';

interface EditingState {
    type: 'course' | 'module' | 'lesson' | null;
    id: string | null;
}

export const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [currentView, setCurrentView] = useState<AdminView>('content');
    const [courses, setCourses] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    
    // Состояния для редактирования
    const [editing, setEditing] = useState<EditingState>({ type: null, id: null });
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    
    // Формы для создания/редактирования
    const [courseForm, setCourseForm] = useState<{
        title: string;
        description: string;
        cover_image: string;
        id: string;
        year_tier: CourseYearTier;
    }>({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' });
    const [moduleForm, setModuleForm] = useState({ title: '', course_id: '', id: '' });
    const [lessonForm, setLessonForm] = useState({ title: '', description: '', video_url: '', homework_task: '', module_id: '', id: '' });
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [scheduleForm, setScheduleForm] = useState({ day_of_week: 1, time_start: '10:00', time_end: '11:00', title: '', description: '', location: '' });

    const [showcasePosts, setShowcasePosts] = useState<ShowcasePostRow[]>([]);
    const [showcaseLoading, setShowcaseLoading] = useState(false);
    const [showcaseAuthors, setShowcaseAuthors] = useState<Record<string, string>>({});
    const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
    const [moderatingPostId, setModeratingPostId] = useState<string | null>(null);

    const courseFileRef = useRef<HTMLInputElement>(null);
    const lessonVideoRef = useRef<HTMLInputElement>(null);
    const editCourseFileRef = useRef<HTMLInputElement>(null);
    const editLessonVideoRef = useRef<HTMLInputElement>(null);
    const courseFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentView === 'content') fetchContent();
        else if (currentView === 'users') fetchUsers();
        else if (currentView === 'schedule') fetchSchedule();
        else if (currentView === 'showcase') void fetchShowcaseModeration();
    }, [currentView]);

    const fetchShowcaseModeration = async () => {
        setShowcaseLoading(true);
        try {
            const posts = await fetchPendingShowcasePosts();
            const ids = [...new Set(posts.map((p) => p.author_id))];
            const map: Record<string, string> = {};
            if (ids.length > 0) {
                const { data: profs } = await supabase.from('profiles').select('id, name').in('id', ids);
                (profs || []).forEach((p: { id: string; name: string | null }) => {
                    map[p.id] = p.name?.trim() || 'Ученик';
                });
            }
            setShowcaseAuthors(map);
            setShowcasePosts(posts);
        } catch (e) {
            console.error('[AdminPanel] showcase', e);
            showToast('Не удалось загрузить очередь витрины', 'error');
            setShowcasePosts([]);
            setShowcaseAuthors({});
        } finally {
            setShowcaseLoading(false);
        }
    };

    const runModerate = async (postId: string, approve: boolean) => {
        const reason = (rejectDraft[postId] || '').trim();
        if (!approve && reason.length < 3) {
            showToast('Напишите причину отклонения (от 3 символов)', 'error');
            return;
        }
        setModeratingPostId(postId);
        try {
            await moderatePost(postId, approve, user.id, reason || undefined);
            showToast(approve ? 'Проект опубликован' : 'Отклонено, ученик увидит причину в уведомлениях', 'success');
            setShowcasePosts((prev) => prev.filter((p) => p.id !== postId));
            setRejectDraft((prev) => {
                const n = { ...prev };
                delete n[postId];
                return n;
            });
        } catch (e) {
            console.error('[AdminPanel] moderate', e);
            showToast('Не удалось сохранить решение', 'error');
        } finally {
            setModeratingPostId(null);
        }
    };

    const runDeleteShowcase = async (postId: string) => {
        if (!window.confirm('Удалить пост из очереди без публикации? Это действие нельзя отменить.')) return;
        setModeratingPostId(postId);
        try {
            await deleteShowcasePost(postId);
            showToast('Пост удалён', 'success');
            setShowcasePosts((prev) => prev.filter((p) => p.id !== postId));
            setRejectDraft((prev) => {
                const n = { ...prev };
                delete n[postId];
                return n;
            });
        } catch (e) {
            console.error('[AdminPanel] delete showcase', e);
            showToast('Не удалось удалить пост', 'error');
        } finally {
            setModeratingPostId(null);
        }
    };

    const fetchContent = async () => {
        setLoading(true);
        try {
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    *,
                    modules (
                        *,
                        lessons (*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (coursesError) {
                console.error('[AdminPanel] Courses fetch error:', coursesError);
                showToast('Не удалось загрузить курсы. Попробуйте обновить страницу', "error");
                setCourses([]);
                setLoading(false);
                return;
            }

            const coursesWithContent = (coursesData || []).map((course: any) => {
                const sortedModules = (course.modules || []).sort((a: any, b: any) =>
                    new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
                ).map((module: any) => ({
                    ...module,
                    lessons: (module.lessons || []).sort((a: any, b: any) =>
                        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
                    )
                }));
                return { ...course, modules: sortedModules };
            });

            setCourses(coursesWithContent);
            if (coursesWithContent.length === 0) showToast("Каталог пуст. Создайте первый курс!", "info");
        } catch (error: any) {
            console.error('[AdminPanel] Content fetch error:', error);
            showToast('Не удалось загрузить каталог. Попробуйте обновить страницу', "error");
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (u: User) => {
        if (u.id === user.id) {
            showToast('Нельзя удалить самого себя', 'error');
            return;
        }
        if (!window.confirm(`Удалить пользователя ${u.name || u.email} из приложения и базы? Это действие нельзя отменить.`)) return;
        setDeletingUserId(u.id);
        try {
            const { data, error } = await supabase.rpc('delete_user_by_admin', { target_user_id: u.id });
            if (error) throw error;
            const result = data as { ok?: boolean; error?: string };
            if (result?.ok) {
                setUsersList(prev => prev.filter(x => x.id !== u.id));
                showToast('Пользователь удалён', 'success');
            } else {
                showToast(result?.error || 'Не удалось удалить', 'error');
            }
        } catch (e: any) {
            showToast(e?.message || 'Ошибка удаления пользователя', 'error');
        } finally {
            setDeletingUserId(null);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Пробуем получить всех пользователей через RPC функцию
            const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_all_users');
            
            if (!rpcError && Array.isArray(rpcUsers)) {
                // Используем данные из RPC (все из auth.users + profiles), в т.ч. только что зарегистрировавшихся
                setUsersList(rpcUsers.map((u: any) => ({
                    id: u.id,
                    email: u.email || '',
                    name: u.name || 'Анонимный пользователь',
                    role: u.role || 'Student',
                    avatar: resolveBundledOrDefault(u.id, u.avatar),
                    level: u.level || 1,
                    xp: u.xp || 0,
                    isApproved: u.is_approved === true
                })));
            } else {
                // Fallback: получаем только из profiles (если RPC недоступен)
                console.warn('[AdminPanel] RPC get_all_users failed, using profiles only:', rpcError);
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (profilesError) {
                    throw profilesError;
                }
                
                if (profilesData) {
                    setUsersList(profilesData.map((u) => ({
                        id: u.id,
                        email: u.email || '',
                        name: u.name || 'Анонимный пользователь',
                        role: u.role || 'Student',
                        avatar: resolveBundledOrDefault(u.id, (u as { avatar?: string | null }).avatar),
                        level: u.level || 0,
                        xp: u.xp || 0,
                        isApproved: (u as { is_approved?: boolean }).is_approved === true,
                    })));
                } else {
                    setUsersList([]);
                }
            }
        } catch (error: any) {
            console.error('[AdminPanel] Users fetch error:', error);
            showToast("Не удалось загрузить список пользователей. Попробуйте позже", "error");
            setUsersList([]);
        }
        setLoading(false);
    };

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('schedule_events').select('*').order('day_of_week').order('sort_order').order('time_start');
            if (!error) setScheduleEvents(data || []);
        } catch (_) { setScheduleEvents([]); }
        setLoading(false);
    };

    const handleAddScheduleEvent = async () => {
        if (!scheduleForm.title.trim()) { showToast('Введите название события', 'error'); return; }
        try {
            const { error } = await supabase.from('schedule_events').insert({
                day_of_week: scheduleForm.day_of_week,
                time_start: scheduleForm.time_start,
                time_end: scheduleForm.time_end || null,
                title: scheduleForm.title.trim(),
                description: scheduleForm.description.trim() || null,
                location: scheduleForm.location.trim() || null
            });
            if (error) throw error;
            showToast('Событие добавлено', 'success');
            setScheduleForm({ day_of_week: 1, time_start: '10:00', time_end: '11:00', title: '', description: '', location: '' });
            fetchSchedule();
        } catch (e: any) {
            showToast(e?.message || 'Ошибка добавления', 'error');
        }
    };

    const handleDeleteScheduleEvent = async (id: string) => {
        if (!window.confirm('Удалить событие?')) return;
        try {
            const { error } = await supabase.from('schedule_events').delete().eq('id', id);
            if (error) throw error;
            showToast('Событие удалено', 'success');
            fetchSchedule();
        } catch (e: any) {
            showToast(e?.message || 'Ошибка удаления', 'error');
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'video', targetId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (type === 'cover') {
            const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            const ext = file.name.split('.').pop()?.toLowerCase();
            const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const mimeOk = validMimes.includes(file.type);
            const extOk = ext && validExts.includes(ext);
            if (!mimeOk && !extOk) {
                showToast('Используйте изображение: JPG, PNG, GIF или WEBP', 'error');
                e.target.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast('Размер изображения не должен превышать 10MB', 'error');
                e.target.value = '';
                return;
            }
        } else if (type === 'video') {
            const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            if (!validTypes.includes(file.type)) {
                showToast('Неподдерживаемый формат видео. Используйте MP4, WEBM или OGG', 'error');
                e.target.value = '';
                return;
            }
            if (file.size > 100 * 1024 * 1024) {
                showToast('Размер видео не должен превышать 100MB', 'error');
                e.target.value = '';
                return;
            }
        }
        
        setUploading(true);
        showToast('Загрузка файла...', 'info');
        
        try {
            const folder = type === 'cover' ? 'covers' : 'videos';
            const url = await uploadFile(file, folder);
            
            if (url) {
                if (type === 'cover') {
                    if (targetId) {
                        // Обновляем существующий курс
                        setCourseForm(prev => ({ ...prev, cover_image: url }));
                    } else {
                        setCourseForm(prev => ({ ...prev, cover_image: url }));
                    }
                    showToast('Обложка успешно загружена', 'success');
                } else if (type === 'video') {
                    if (targetId) {
                        setLessonForm(prev => ({ ...prev, video_url: url }));
                    } else {
                        setLessonForm(prev => ({ ...prev, video_url: url }));
                    }
                    showToast('Видео успешно загружено', 'success');
                }
            } else {
                showToast('Не удалось загрузить файл. Попробуйте еще раз', 'error');
            }
        } catch (error: any) {
            console.error('[AdminPanel] Upload error:', error);
            showToast('Не удалось загрузить файл. Проверьте формат и размер файла', 'error');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // CRUD операции для курсов
    const handleCreateCourse = async () => {
        if (!courseForm.title) {
            showToast('Введите название курса', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('courses').insert({
                title: courseForm.title,
                description: courseForm.description,
                cover_image: courseForm.cover_image,
                type: 'Course',
                year_tier: courseForm.year_tier,
            });
            if (error) throw error;
            setCourseForm({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' });
            await fetchContent();
            showToast('Новый курс создан', 'success');
        } catch (error: any) {
            showToast('Ошибка при создании курса', 'error');
            console.error('[AdminPanel] Create course error:', error);
        }
        setLoading(false);
    };

    const handleEditCourse = (course: any) => {
        setCourseForm({
            id: course.id,
            title: course.title || '',
            description: course.description || '',
            cover_image: course.cover_image || '',
            year_tier: normalizeCourseYearTier(course.year_tier),
        });
        setEditing({ type: 'course', id: course.id });
        setExpandedCourses(new Set([course.id]));
        // Скроллим к форме редактирования
        setTimeout(() => {
            courseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleUpdateCourse = async () => {
        if (!courseForm.id || !courseForm.title) {
            showToast('Введите название курса', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('courses')
                .update({
                    title: courseForm.title,
                    description: courseForm.description,
                    cover_image: courseForm.cover_image,
                    year_tier: courseForm.year_tier,
                })
                .eq('id', courseForm.id);
            if (error) throw error;
            setEditing({ type: null, id: null });
            setCourseForm({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' });
            await fetchContent();
            showToast('Курс обновлен', 'success');
        } catch (error: any) {
            showToast('Ошибка при обновлении курса', 'error');
            console.error('[AdminPanel] Update course error:', error);
        }
        setLoading(false);
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm('Удалить курс и все его модули и уроки? Это действие необратимо!')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('courses').delete().eq('id', courseId);
            if (error) throw error;
            await fetchContent();
            showToast('Курс удален', 'success');
        } catch (error: any) {
            showToast('Ошибка при удалении курса', 'error');
            console.error('[AdminPanel] Delete course error:', error);
        }
        setLoading(false);
    };

    // CRUD операции для модулей
    const handleCreateModule = async (courseId: string) => {
        if (!moduleForm.title) {
            showToast('Введите название модуля', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('modules').insert({
                course_id: courseId,
                title: moduleForm.title
            });
            if (error) throw error;
            setModuleForm({ title: '', course_id: '', id: '' });
            await fetchContent();
            showToast('Модуль создан', 'success');
        } catch (error: any) {
            showToast('Ошибка при создании модуля', 'error');
            console.error('[AdminPanel] Create module error:', error);
        }
        setLoading(false);
    };

    const handleEditModule = (module: any) => {
        setModuleForm({
            id: module.id,
            title: module.title || '',
            course_id: module.course_id || ''
        });
        setEditing({ type: 'module', id: module.id });
    };

    const handleUpdateModule = async () => {
        if (!moduleForm.id || !moduleForm.title) {
            showToast('Введите название модуля', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('modules')
                .update({ title: moduleForm.title })
                .eq('id', moduleForm.id);
            if (error) throw error;
            setEditing({ type: null, id: null });
            setModuleForm({ title: '', course_id: '', id: '' });
            await fetchContent();
            showToast('Модуль обновлен', 'success');
        } catch (error: any) {
            showToast('Ошибка при обновлении модуля', 'error');
            console.error('[AdminPanel] Update module error:', error);
        }
        setLoading(false);
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Удалить модуль и все его уроки? Это действие необратимо!')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('modules').delete().eq('id', moduleId);
            if (error) throw error;
            await fetchContent();
            showToast('Модуль удален', 'success');
        } catch (error: any) {
            showToast('Ошибка при удалении модуля', 'error');
            console.error('[AdminPanel] Delete module error:', error);
        }
        setLoading(false);
    };

    // CRUD операции для уроков
    const handleCreateLesson = async (moduleId: string) => {
        if (!lessonForm.title) {
            showToast('Введите название урока', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('lessons').insert({
                module_id: moduleId,
                title: lessonForm.title,
                description: lessonForm.description,
                video_url: lessonForm.video_url,
                homework_task: lessonForm.homework_task
            });
            if (error) throw error;
            setLessonForm({ title: '', description: '', video_url: '', homework_task: '', module_id: '', id: '' });
            await fetchContent();
            showToast('Урок создан', 'success');
        } catch (error: any) {
            showToast('Ошибка при создании урока', 'error');
            console.error('[AdminPanel] Create lesson error:', error);
        }
        setLoading(false);
    };

    const handleEditLesson = (lesson: any) => {
        setLessonForm({
            id: lesson.id,
            title: lesson.title || '',
            description: lesson.description || '',
            video_url: lesson.video_url || '',
            homework_task: lesson.homework_task || '',
            module_id: lesson.module_id || ''
        });
        setEditing({ type: 'lesson', id: lesson.id });
    };

    const handleUpdateLesson = async () => {
        if (!lessonForm.id || !lessonForm.title) {
            showToast('Введите название урока', 'error');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('lessons')
                .update({
                    title: lessonForm.title,
                    description: lessonForm.description,
                    video_url: lessonForm.video_url,
                    homework_task: lessonForm.homework_task
                })
                .eq('id', lessonForm.id);
            if (error) throw error;
            setEditing({ type: null, id: null });
            setLessonForm({ title: '', description: '', video_url: '', homework_task: '', module_id: '', id: '' });
            await fetchContent();
            showToast('Урок обновлен', 'success');
        } catch (error: any) {
            showToast('Ошибка при обновлении урока', 'error');
            console.error('[AdminPanel] Update lesson error:', error);
        }
        setLoading(false);
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Удалить урок безвозвратно?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
            if (error) throw error;
            await fetchContent();
            showToast('Урок удален', 'success');
        } catch (error: any) {
            showToast('Ошибка при удалении урока', 'error');
            console.error('[AdminPanel] Delete lesson error:', error);
        }
        setLoading(false);
    };

    const toggleUserApproval = async (u: User) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_approved: !u.isApproved })
                .eq('id', u.id);
            
            if (error) throw error;
            showToast(u.isApproved ? 'Доступ ограничен' : 'Доступ разрешен', 'success');
            await fetchUsers();
        } catch (error: any) {
            showToast('Ошибка при изменении доступа', 'error');
            console.error('[AdminPanel] Toggle approval error:', error);
        }
    };

    const toggleCourseExpanded = (courseId: string) => {
        const newExpanded = new Set(expandedCourses);
        if (newExpanded.has(courseId)) {
            newExpanded.delete(courseId);
        } else {
            newExpanded.add(courseId);
        }
        setExpandedCourses(newExpanded);
    };

    const toggleModuleExpanded = (moduleId: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(moduleId)) {
            newExpanded.delete(moduleId);
        } else {
            newExpanded.add(moduleId);
        }
        setExpandedModules(newExpanded);
    };

    if (user.role !== Role.ADMIN) return <AccessGate />;

    const filteredUsers = usersList.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-slide-up space-y-4 pb-6 md:pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#282828] pb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-kiddy-cherry/10 border border-kiddy-cherry/20 rounded-lg">
                        <Shield className="text-kiddy-cherry" size={20} />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white uppercase tracking-tighter italic">Панель управления</h1>
                </div>
                <div className="flex flex-wrap bg-[#181818] p-1 rounded-xl border border-white/5 shadow-inner">
                    <button onClick={() => setCurrentView('content')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'content' ? 'bg-zinc-800 text-white shadow-lg' : 'text-kiddy-textMuted hover:text-kiddy-textSecondary'}`}>КОНТЕНТ</button>
                    <button onClick={() => setCurrentView('users')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'users' ? 'bg-zinc-800 text-white shadow-lg' : 'text-kiddy-textMuted hover:text-kiddy-textSecondary'}`}>ПОЛЬЗОВАТЕЛИ</button>
                    <button onClick={() => setCurrentView('schedule')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'schedule' ? 'bg-zinc-800 text-white shadow-lg' : 'text-kiddy-textMuted hover:text-kiddy-textSecondary'}`}>РАСПИСАНИЕ</button>
                    <button onClick={() => setCurrentView('showcase')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${currentView === 'showcase' ? 'bg-zinc-800 text-white shadow-lg' : 'text-kiddy-textMuted hover:text-kiddy-textSecondary'}`}><Sparkles size={12} /> ВИТРИНА</button>
                </div>
            </header>

            {loading && currentView !== 'showcase' && (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-700" size={40} /></div>
            )}

            {!loading && currentView === 'content' && (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    {/* Форма создания/редактирования курса */}
                    <div ref={courseFormRef}>
                        <Card className={`bg-[#121212]/40 border-[#282828] p-6 transition-all ${editing.type === 'course' ? 'border-kiddy-cherry ring-2 ring-kiddy-cherry/20 shadow-lg shadow-kiddy-cherry/10' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                                    {editing.type === 'course' ? (
                                        <span className="flex items-center gap-2">
                                            <Edit2 size={16} className="text-kiddy-cherry" />
                                            Редактировать курс
                                        </span>
                                    ) : (
                                        'Создать новый курс'
                                    )}
                                </h2>
                                {editing.type === 'course' && (
                                    <button
                                        onClick={() => {
                                            setEditing({ type: null, id: null });
                                            setCourseForm({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' });
                                        }}
                                        className="text-kiddy-textMuted hover:text-white transition-colors"
                                        title="Отменить редактирование"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        <div className="space-y-4">
                            <input
                                value={courseForm.title}
                                onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                                placeholder="Название курса"
                                className="w-full bg-black border border-[#282828] p-3 rounded-lg text-white outline-none focus:border-kiddy-cherry"
                            />
                            <textarea
                                value={courseForm.description}
                                onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                                placeholder="Описание курса"
                                className="w-full bg-black border border-[#282828] p-3 rounded-lg text-white outline-none focus:border-kiddy-cherry min-h-[100px]"
                            />
                            <div>
                                <label className="text-[10px] text-kiddy-textMuted font-bold uppercase tracking-widest block mb-2">Год занятий</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['year_1', 'year_2_plus'] as const).map((tier) => (
                                        <button
                                            key={tier}
                                            type="button"
                                            onClick={() => setCourseForm({ ...courseForm, year_tier: tier })}
                                            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                                                courseForm.year_tier === tier
                                                    ? 'bg-kiddy-cherry text-white'
                                                    : 'bg-[#181818] text-kiddy-textMuted hover:text-white border border-[#282828]'
                                            }`}
                                        >
                                            {COURSE_YEAR_LABELS[tier]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={courseForm.cover_image}
                                    onChange={e => setCourseForm({...courseForm, cover_image: e.target.value})}
                                    placeholder="URL обложки или загрузите файл"
                                    className="flex-1 bg-black border border-[#282828] p-3 rounded-lg text-kiddy-textSecondary outline-none focus:border-kiddy-cherry"
                                />
                                <button
                                    onClick={() => editing.type === 'course' ? editCourseFileRef.current?.click() : courseFileRef.current?.click()}
                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white"
                                    disabled={uploading}
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                </button>
                                <input
                                    type="file"
                                    ref={courseFileRef}
                                    className="hidden"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={e => handleUpload(e, 'cover')}
                                />
                                <input
                                    type="file"
                                    ref={editCourseFileRef}
                                    className="hidden"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={e => handleUpload(e, 'cover', courseForm.id)}
                                />
                            </div>
                            {courseForm.cover_image && (
                                <img src={courseForm.cover_image} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-[#282828]" />
                            )}
                            <div className="flex gap-2">
                                {editing.type === 'course' ? (
                                    <>
                                        <button onClick={handleUpdateCourse} className="flex-1 py-2 bg-kiddy-cherry text-white text-sm font-bold rounded-lg hover:bg-rose-600">
                                            Сохранить
                                        </button>
                                        <button onClick={() => { setEditing({ type: null, id: null }); setCourseForm({ title: '', description: '', cover_image: '', id: '', year_tier: 'year_1' }); }} className="px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-lg hover:bg-zinc-700">
                                            Отмена
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleCreateCourse} className="flex-1 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-kiddy-cherry hover:text-white">
                                        Создать курс
                                    </button>
                                )}
                            </div>
                        </div>
                        </Card>
                    </div>

                    {/* Список курсов */}
                    <div className="space-y-4">
                        {courses.map(course => (
                            <Card key={course.id} className="bg-[#121212]/40 border-[#282828] overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <button
                                            onClick={() => toggleCourseExpanded(course.id)}
                                            className="text-kiddy-textMuted hover:text-white"
                                        >
                                            {expandedCourses.has(course.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                        {course.cover_image && (
                                            <img src={course.cover_image} alt={course.title} className="w-16 h-16 object-cover rounded-lg" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                                                <h3 className="text-white font-bold">{course.title}</h3>
                                                <span className="shrink-0 rounded-md border border-kiddy-cherry/25 bg-kiddy-cherry/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-kiddy-cherry">
                                                    {COURSE_YEAR_LABELS[normalizeCourseYearTier(course.year_tier)]}
                                                </span>
                                            </div>
                                            <p className="text-kiddy-textMuted text-xs mt-1 line-clamp-1">{course.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditCourse(course)}
                                            className={`p-2 rounded-lg transition-all ${
                                                editing.type === 'course' && editing.id === course.id
                                                    ? 'bg-kiddy-cherry text-white'
                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                            }`}
                                            title="Редактировать курс"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCourse(course.id)}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {expandedCourses.has(course.id) && (
                                    <div className="px-4 pb-4 space-y-4 border-t border-[#282828] mt-4 pt-4">
                                        {/* Форма создания модуля */}
                                        <div className="bg-black/50 p-4 rounded-lg border border-[#282828]">
                                            <h4 className="text-kiddy-textSecondary text-xs font-bold uppercase mb-3">Добавить модуль</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    value={moduleForm.title}
                                                    onChange={e => setModuleForm({...moduleForm, title: e.target.value, course_id: course.id})}
                                                    placeholder="Название модуля"
                                                    className="flex-1 bg-[#181818] border border-[#282828] p-2 rounded-lg text-white text-sm outline-none focus:border-kiddy-cherry"
                                                />
                                                <button
                                                    onClick={() => handleCreateModule(course.id)}
                                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm font-bold"
                                                >
                                                    Добавить
                                                </button>
                                            </div>
                                        </div>

                                        {/* Список модулей */}
                                        {course.modules?.map((module: any) => (
                                            <div key={module.id} className="bg-black/30 p-4 rounded-lg border border-[#282828]">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleModuleExpanded(module.id)}
                                                            className="text-kiddy-textMuted hover:text-white"
                                                        >
                                                            {expandedModules.has(module.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </button>
                                                        <h4 className="text-white font-bold text-sm">{module.title}</h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditModule(module)}
                                                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteModule(module.id)}
                                                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {editing.type === 'module' && editing.id === module.id && (
                                                    <div className="bg-[#181818]/50 p-3 rounded-lg mb-3 space-y-2">
                                                        <input
                                                            value={moduleForm.title}
                                                            onChange={e => setModuleForm({...moduleForm, title: e.target.value})}
                                                            className="w-full bg-black border border-[#282828] p-2 rounded text-white text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={handleUpdateModule} className="flex-1 py-1.5 bg-kiddy-cherry text-white text-xs font-bold rounded">
                                                                Сохранить
                                                            </button>
                                                            <button onClick={() => setEditing({ type: null, id: null })} className="px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded">
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {expandedModules.has(module.id) && (
                                                    <div className="space-y-3">
                                                        {/* Форма создания урока */}
                                                        <div className="bg-[#181818]/30 p-3 rounded border border-[#282828]">
                                                            <h5 className="text-kiddy-textMuted text-[10px] font-bold uppercase mb-2">Добавить урок</h5>
                                                            <div className="space-y-2">
                                                                <input
                                                                    value={lessonForm.title}
                                                                    onChange={e => setLessonForm({...lessonForm, title: e.target.value, module_id: module.id})}
                                                                    placeholder="Название урока"
                                                                    className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs"
                                                                />
                                                                <textarea
                                                                    value={lessonForm.description}
                                                                    onChange={e => setLessonForm({...lessonForm, description: e.target.value})}
                                                                    placeholder="Описание"
                                                                    className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs min-h-[60px]"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        value={lessonForm.video_url}
                                                                        onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                                                                        placeholder="URL видео"
                                                                        className="flex-1 bg-black border border-[#282828] p-2 rounded text-kiddy-textSecondary text-xs"
                                                                    />
                                                                    <button
                                                                        onClick={() => lessonVideoRef.current?.click()}
                                                                        className="p-2 bg-zinc-800 rounded text-white"
                                                                        disabled={uploading}
                                                                    >
                                                                        {uploading ? <Loader2 className="animate-spin" size={14} /> : <Video size={14} />}
                                                                    </button>
                                                                    <input type="file" ref={lessonVideoRef} className="hidden" accept="video/*" onChange={e => handleUpload(e, 'video')} />
                                                                </div>
                                                                <textarea
                                                                    value={lessonForm.homework_task}
                                                                    onChange={e => setLessonForm({...lessonForm, homework_task: e.target.value})}
                                                                    placeholder="Домашнее задание (это задание будет использоваться ИИ для проверки)"
                                                                    className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs min-h-[80px]"
                                                                />
                                                                <button
                                                                    onClick={() => handleCreateLesson(module.id)}
                                                                    className="w-full py-2 bg-kiddy-cherry text-white text-xs font-bold rounded hover:bg-rose-600"
                                                                >
                                                                    Создать урок
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Список уроков */}
                                                        {module.lessons?.map((lesson: any) => (
                                                            <div key={lesson.id} className="bg-[#181818]/50 p-3 rounded border border-[#282828]">
                                                                {editing.type === 'lesson' && editing.id === lesson.id ? (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            value={lessonForm.title}
                                                                            onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                                                                            className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs"
                                                                        />
                                                                        <textarea
                                                                            value={lessonForm.description}
                                                                            onChange={e => setLessonForm({...lessonForm, description: e.target.value})}
                                                                            className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs min-h-[60px]"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                value={lessonForm.video_url}
                                                                                onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                                                                                className="flex-1 bg-black border border-[#282828] p-2 rounded text-kiddy-textSecondary text-xs"
                                                                            />
                                                                            <button
                                                                                onClick={() => editLessonVideoRef.current?.click()}
                                                                                className="p-2 bg-zinc-800 rounded text-white"
                                                                                disabled={uploading}
                                                                            >
                                                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Video size={14} />}
                                                                            </button>
                                                                            <input type="file" ref={editLessonVideoRef} className="hidden" accept="video/*" onChange={e => handleUpload(e, 'video', lesson.id)} />
                                                                        </div>
                                                                        <textarea
                                                                            value={lessonForm.homework_task}
                                                                            onChange={e => setLessonForm({...lessonForm, homework_task: e.target.value})}
                                                                            placeholder="Домашнее задание"
                                                                            className="w-full bg-black border border-[#282828] p-2 rounded text-white text-xs min-h-[80px]"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button onClick={handleUpdateLesson} className="flex-1 py-1.5 bg-kiddy-cherry text-white text-xs font-bold rounded">
                                                                                Сохранить
                                                                            </button>
                                                                            <button onClick={() => setEditing({ type: null, id: null })} className="px-3 py-1.5 bg-zinc-800 text-white text-xs font-bold rounded">
                                                                                Отмена
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1">
                                                                            <h5 className="text-white font-bold text-xs">{lesson.title}</h5>
                                                                            {lesson.homework_task && (
                                                                                <p className="text-kiddy-textMuted text-[10px] mt-1 line-clamp-1">Задание: {lesson.homework_task}</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleEditLesson(lesson)}
                                                                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white"
                                                                            >
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLesson(lesson.id)}
                                                                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-500"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {!loading && currentView === 'users' && (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-kiddy-textMuted" size={18} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Поиск пользователей..."
                                className="w-full bg-black border border-[#282828] pl-10 pr-4 py-3 rounded-lg text-white outline-none focus:border-kiddy-cherry"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredUsers.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <p className="text-kiddy-textMuted font-bold uppercase text-xs tracking-widest">
                                        {searchQuery ? 'Пользователи не найдены' : 'Не удалось загрузить список пользователей'}
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map(u => (
                                    <Card key={u.id} className="bg-black border-[#282828] p-0 flex items-center justify-between group overflow-hidden shadow-xl" noPadding>
                                        <div className="p-4 flex items-center gap-4 flex-1">
                                            <img
                                              src={resolveBundledOrDefault(u.id, u.avatar)}
                                              className="w-12 h-12 rounded-full border border-[#282828] bg-zinc-600 object-cover"
                                              alt=""
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-white font-bold text-sm truncate">{u.name}</h4>
                                                <p className="text-kiddy-textMuted text-[9px] uppercase tracking-tighter truncate">{u.email || 'БЕЗ_EMAIL'}</p>
                                                <p className="text-zinc-700 text-[8px] mt-1">{u.role}</p>
                                            </div>
                                        </div>
                                        <div className="pr-4 flex items-center gap-1">
                                            <button
                                                onClick={() => toggleUserApproval(u)}
                                                className={`p-2 rounded-lg transition-all ${u.isApproved ? 'text-green-500' : 'text-zinc-700 hover:text-white'}`}
                                                title={u.isApproved ? 'Заблокировать' : 'Одобрить'}
                                            >
                                                {u.isApproved ? <Unlock size={16}/> : <Lock size={16}/>}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                disabled={deletingUserId === u.id || u.id === user.id}
                                                className="p-2 rounded-lg text-kiddy-textMuted hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                                title={u.id === user.id ? 'Нельзя удалить себя' : 'Удалить пользователя'}
                                            >
                                                {deletingUserId === u.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {currentView === 'showcase' && (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                    <Card className="bg-[#121212]/40 border-[#282828] p-6">
                        <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Sparkles size={16} className="text-kiddy-cherry" /> Модерация витрины
                        </h2>
                        <p className="text-kiddy-textMuted text-xs max-w-2xl">
                            Новые посты учеников попадают сюда. После одобрения они видны в разделе «Сообщество → Витрина». При отклонении укажите, что исправить — текст уйдёт в уведомление автору.
                        </p>
                    </Card>
                    {showcaseLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-zinc-600" size={36} /></div>
                    ) : showcasePosts.length === 0 ? (
                        <p className="text-kiddy-textMuted text-sm px-2">Нет постов в очереди.</p>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {showcasePosts.map((post) => {
                                const sel = (post.phrase_selections || {}) as PhraseSelections;
                                const text = showcasePostBody(sel);
                                const authorName = showcaseAuthors[post.author_id] || 'Ученик';
                                const busy = moderatingPostId === post.id;
                                const media = (post.media || []) as MediaItem[];
                                return (
                                    <Card key={post.id} className="bg-[#121212]/50 border-[#282828] p-5 space-y-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-kiddy-textMuted">Автор</p>
                                                <p className="text-white font-bold">{authorName}</p>
                                                <p className="text-kiddy-textMuted text-xs mt-1">{new Date(post.created_at).toLocaleString('ru-RU')}</p>
                                            </div>
                                        </div>
                                        <p className="text-kiddy-textSecondary text-sm leading-relaxed whitespace-pre-wrap">{text || '—'}</p>
                                        {media.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {media.map((m, i) => (
                                                    m.kind === 'video' ? (
                                                        <video key={i} src={mediaPublicUrl(m.path)} className="max-h-40 rounded-lg border border-white/10" controls muted />
                                                    ) : (
                                                        <img key={i} src={mediaPublicUrl(m.path)} alt="" className="max-h-40 rounded-lg border border-white/10 object-cover" />
                                                    )
                                                ))}
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Причина при отклонении</label>
                                            <textarea
                                                value={rejectDraft[post.id] || ''}
                                                onChange={(e) => setRejectDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                                                rows={2}
                                                placeholder="Например: добавь скриншот результата или пересними видео без бликов"
                                                className="w-full bg-black border border-[#282828] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-kiddy-cherry resize-none"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void runModerate(post.id, true)}
                                                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                                            >
                                                Одобрить
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void runModerate(post.id, false)}
                                                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-white/10 disabled:opacity-50"
                                            >
                                                Отклонить
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void runDeleteShowcase(post.id)}
                                                className="px-5 py-2.5 text-red-400/95 hover:bg-red-500/15 text-xs font-bold rounded-xl border border-red-500/25 disabled:opacity-50"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {!loading && currentView === 'schedule' && (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                    <Card className="bg-[#121212]/40 border-[#282828] p-6 shrink-0">
                        <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={16} /> Добавить событие</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">День недели</label>
                                <select value={scheduleForm.day_of_week} onChange={e => setScheduleForm({ ...scheduleForm, day_of_week: +e.target.value })} className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kiddy-cherry">
                                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Начало</label>
                                    <input type="text" value={scheduleForm.time_start} onChange={e => setScheduleForm({ ...scheduleForm, time_start: e.target.value })} placeholder="10:00" className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kiddy-cherry" />
                                </div>
                                <div>
                                    <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Конец</label>
                                    <input type="text" value={scheduleForm.time_end} onChange={e => setScheduleForm({ ...scheduleForm, time_end: e.target.value })} placeholder="11:00" className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kiddy-cherry" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Название</label>
                                <input type="text" value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="Урок Python" className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white outline-none focus:border-kiddy-cherry" />
                            </div>
                            <div>
                                <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Описание (необяз.)</label>
                                <textarea value={scheduleForm.description} onChange={e => setScheduleForm({ ...scheduleForm, description: e.target.value })} placeholder="Тема урока..." rows={2} className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kiddy-cherry resize-none" />
                            </div>
                            <div>
                                <label className="text-kiddy-textMuted text-[10px] font-bold uppercase block mb-1">Место / ссылка (необяз.)</label>
                                <input type="text" value={scheduleForm.location} onChange={e => setScheduleForm({ ...scheduleForm, location: e.target.value })} placeholder="Zoom или адрес" className="w-full bg-black border border-[#282828] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-kiddy-cherry" />
                            </div>
                        </div>
                        <button onClick={handleAddScheduleEvent} className="mt-4 px-6 py-3 bg-kiddy-cherry text-white font-bold rounded-xl hover:bg-rose-700 transition-all flex items-center gap-2">
                            <Plus size={18} /> Добавить событие
                        </button>
                    </Card>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <h3 className="text-kiddy-textMuted text-xs font-bold uppercase tracking-widest mb-3">Все события</h3>
                        <div className="space-y-2">
                            {scheduleEvents.length === 0 ? (
                                <p className="text-kiddy-textMuted text-sm">Событий пока нет. Добавьте выше.</p>
                            ) : (
                                scheduleEvents.sort((a, b) => a.day_of_week - b.day_of_week || (a.time_start || '').localeCompare(b.time_start || '')).map((ev) => (
                                    <div key={ev.id} className="flex items-center justify-between gap-4 py-3 px-4 bg-[#121212]/60 border border-[#282828] rounded-xl">
                                        <div>
                                            <span className="text-kiddy-textMuted text-xs font-bold mr-2">{[ 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс' ][ev.day_of_week - 1]}</span>
                                            <span className="text-kiddy-cherry font-mono text-sm">{ev.time_start}{ev.time_end ? ` – ${ev.time_end}` : ''}</span>
                                            <span className="text-white font-bold ml-2">{ev.title}</span>
                                            {ev.location && <span className="text-kiddy-textMuted text-xs block mt-0.5">{ev.location}</span>}
                                        </div>
                                        <button onClick={() => handleDeleteScheduleEvent(ev.id)} className="p-2 text-kiddy-textMuted hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
