
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { supabase, uploadFile } from '../services/supabase';
import { 
    Plus, Database, Layers, FileText, Loader2, Trash2, Video, 
    Image as ImageIcon, Upload, Shield, Lock, Unlock, Settings as SettingsIcon,
    Edit2, Save, X, ChevronRight, ChevronDown, Search, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Course, User, Role } from '../types';
import { AccessGate } from '../components/AccessGate';
import { useToast } from '../contexts/ToastContext';

type AdminView = 'content' | 'users' | 'settings';

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
    const [globalSettings, setGlobalSettings] = useState({ logo_url: '', school_name: '' });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Состояния для редактирования
    const [editing, setEditing] = useState<EditingState>({ type: null, id: null });
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    
    // Формы для создания/редактирования
    const [courseForm, setCourseForm] = useState({ title: '', description: '', cover_image: '', id: '' });
    const [moduleForm, setModuleForm] = useState({ title: '', course_id: '', id: '' });
    const [lessonForm, setLessonForm] = useState({ title: '', description: '', video_url: '', homework_task: '', module_id: '', id: '' });

    const courseFileRef = useRef<HTMLInputElement>(null);
    const lessonVideoRef = useRef<HTMLInputElement>(null);
    const logoFileRef = useRef<HTMLInputElement>(null);
    const editCourseFileRef = useRef<HTMLInputElement>(null);
    const editLessonVideoRef = useRef<HTMLInputElement>(null);
    const courseFormRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentView === 'content') fetchContent();
        if (currentView === 'users') fetchUsers();
        if (currentView === 'settings') fetchSettings();
    }, [currentView]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('settings').select('*');
            if (error) throw error;
            if (data) {
                const settingsMap = data.reduce((acc: any, item: any) => {
                    acc[item.id] = item.value;
                    return acc;
                }, {});
                setGlobalSettings(settingsMap);
            }
        } catch (error: any) {
            console.error('[AdminPanel] Settings fetch error:', error);
            showToast('Ошибка загрузки настроек', 'error');
        }
        setLoading(false);
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const updates = [
                { id: 'logo_url', value: globalSettings.logo_url },
                { id: 'school_name', value: globalSettings.school_name }
            ];
            const { error } = await supabase.from('settings').upsert(updates);
            if (error) throw error;
            showToast('Глобальные настройки обновлены', 'success');
        } catch (error: any) {
            showToast('Ошибка сохранения конфигурации', 'error');
            console.error('[AdminPanel] Save settings error:', error);
        }
        setLoading(false);
    };

    const fetchContent = async () => {
        setLoading(true);
        try {
            // Сначала пробуем получить курсы
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (coursesError) {
                console.error('[AdminPanel] Courses fetch error:', coursesError);
                showToast(`Ошибка при загрузке курсов: ${coursesError.message}`, "error");
                setCourses([]);
                setLoading(false);
                return;
            }
            
            if (!coursesData || coursesData.length === 0) {
                setCourses([]);
                setLoading(false);
                return;
            }
            
            // Затем для каждого курса получаем модули и уроки
            const coursesWithContent = await Promise.all(
                coursesData.map(async (course: any) => {
                    const { data: modulesData } = await supabase
                        .from('modules')
                        .select('*')
                        .eq('course_id', course.id)
                        .order('created_at', { ascending: true });
                    
                    if (modulesData && modulesData.length > 0) {
                        const modulesWithLessons = await Promise.all(
                            modulesData.map(async (module: any) => {
                                const { data: lessonsData } = await supabase
                                    .from('lessons')
                                    .select('*')
                                    .eq('module_id', module.id)
                                    .order('created_at', { ascending: true });
                                
                                return {
                                    ...module,
                                    lessons: lessonsData || []
                                };
                            })
                        );
                        
                        return {
                            ...course,
                            modules: modulesWithLessons
                        };
                    }
                    
                    return {
                        ...course,
                        modules: []
                    };
                })
            );
            
            setCourses(coursesWithContent);
            if (coursesWithContent.length === 0) {
                showToast("Каталог пуст. Создайте первый курс!", "info");
            }
        } catch (error: any) {
            console.error('[AdminPanel] Content fetch error:', error);
            showToast(`Ошибка при загрузке каталога: ${error?.message || 'Неизвестная ошибка'}`, "error");
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Пробуем получить пользователей из auth.users через RPC или напрямую из profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (profilesError) {
                // Если profiles не работает, пробуем через auth
                console.warn('[AdminPanel] Profiles error, trying auth.users:', profilesError);
                const { data: authData, error: authError } = await supabase.auth.admin?.listUsers();
                if (authError) throw authError;
                if (authData) {
                    setUsersList(authData.users.map((u: any) => ({
                        id: u.id,
                        email: u.email || '',
                        name: u.user_metadata?.name || u.email?.split('@')[0] || 'Пользователь',
                        role: u.user_metadata?.role || 'Student',
                        avatar: u.user_metadata?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.user_metadata?.name || 'U')}&background=random`,
                        level: 1,
                        xp: 0,
                        isApproved: u.user_metadata?.is_approved === true
                    })));
                }
            } else if (profilesData) {
                setUsersList(profilesData.map(u => ({ 
                    id: u.id,
                    email: u.email || '',
                    name: u.name || 'Анонимный пользователь',
                    role: u.role || 'Student',
                    avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=random`,
                    level: u.level || 0,
                    xp: u.xp || 0,
                    isApproved: u.is_approved === true
                })));
            }
        } catch (error: any) {
            console.error('[AdminPanel] Users fetch error:', error);
            showToast("Ошибка доступа к реестру пользователей. Проверьте RLS политики в Supabase", "error");
        }
        setLoading(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'video' | 'logo', targetId?: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (type === 'cover' || type === 'logo') {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast('Неподдерживаемый формат изображения. Используйте JPG, PNG, GIF или WEBP', 'error');
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
            const folder = type === 'logo' ? 'images' : (type === 'cover' ? 'covers' : 'videos');
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
                } else if (type === 'logo') {
                    setGlobalSettings(prev => ({ ...prev, logo_url: url }));
                    showToast('Логотип успешно загружен', 'success');
                }
            } else {
                showToast('Не удалось загрузить файл. Проверьте настройки хранилища Supabase', 'error');
            }
        } catch (error: any) {
            console.error('[AdminPanel] Upload error:', error);
            showToast(`Ошибка загрузки: ${error?.message || 'Неизвестная ошибка'}`, 'error');
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
                type: 'Course'
            });
            if (error) throw error;
            setCourseForm({ title: '', description: '', cover_image: '', id: '' });
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
            cover_image: course.cover_image || ''
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
                    cover_image: courseForm.cover_image
                })
                .eq('id', courseForm.id);
            if (error) throw error;
            setEditing({ type: null, id: null });
            setCourseForm({ title: '', description: '', cover_image: '', id: '' });
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
        <div className="flex flex-col h-screen animate-slide-up space-y-4 pb-10 overflow-hidden">
            <header className="flex justify-between items-center border-b border-zinc-900 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-kiddy-primary/10 border border-kiddy-primary/20 rounded-lg">
                        <Shield className="text-kiddy-primary" size={20} />
                    </div>
                    <h1 className="text-xl font-display font-bold text-white uppercase tracking-tighter italic">Панель управления</h1>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5 shadow-inner">
                    <button onClick={() => setCurrentView('content')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'content' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-400'}`}>КОНТЕНТ</button>
                    <button onClick={() => setCurrentView('users')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'users' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-400'}`}>ПОЛЬЗОВАТЕЛИ</button>
                    <button onClick={() => setCurrentView('settings')} className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all ${currentView === 'settings' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-400'}`}>НАСТРОЙКИ</button>
                </div>
            </header>

            {loading && (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-700" size={40} /></div>
            )}

            {!loading && currentView === 'content' && (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    {/* Форма создания/редактирования курса */}
                    <div ref={courseFormRef}>
                        <Card className={`bg-zinc-950/40 border-zinc-900 p-6 transition-all ${editing.type === 'course' ? 'border-kiddy-primary ring-2 ring-kiddy-primary/20 shadow-lg shadow-kiddy-primary/10' : ''}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                                    {editing.type === 'course' ? (
                                        <span className="flex items-center gap-2">
                                            <Edit2 size={16} className="text-kiddy-primary" />
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
                                            setCourseForm({ title: '', description: '', cover_image: '', id: '' });
                                        }}
                                        className="text-zinc-500 hover:text-white transition-colors"
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
                                className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-kiddy-primary"
                            />
                            <textarea
                                value={courseForm.description}
                                onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                                placeholder="Описание курса"
                                className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-kiddy-primary min-h-[100px]"
                            />
                            <div className="flex gap-2">
                                <input
                                    value={courseForm.cover_image}
                                    onChange={e => setCourseForm({...courseForm, cover_image: e.target.value})}
                                    placeholder="URL обложки или загрузите файл"
                                    className="flex-1 bg-black border border-zinc-800 p-3 rounded-lg text-zinc-400 outline-none focus:border-kiddy-primary"
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
                                    accept="image/*"
                                    onChange={e => handleUpload(e, 'cover')}
                                />
                                <input
                                    type="file"
                                    ref={editCourseFileRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={e => handleUpload(e, 'cover', courseForm.id)}
                                />
                            </div>
                            {courseForm.cover_image && (
                                <img src={courseForm.cover_image} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-zinc-800" />
                            )}
                            <div className="flex gap-2">
                                {editing.type === 'course' ? (
                                    <>
                                        <button onClick={handleUpdateCourse} className="flex-1 py-2 bg-kiddy-primary text-white text-sm font-bold rounded-lg hover:bg-rose-600">
                                            Сохранить
                                        </button>
                                        <button onClick={() => { setEditing({ type: null, id: null }); setCourseForm({ title: '', description: '', cover_image: '', id: '' }); }} className="px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-lg hover:bg-zinc-700">
                                            Отмена
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleCreateCourse} className="flex-1 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-kiddy-primary hover:text-white">
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
                            <Card key={course.id} className="bg-zinc-950/40 border-zinc-900 overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <button
                                            onClick={() => toggleCourseExpanded(course.id)}
                                            className="text-zinc-500 hover:text-white"
                                        >
                                            {expandedCourses.has(course.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                        {course.cover_image && (
                                            <img src={course.cover_image} alt={course.title} className="w-16 h-16 object-cover rounded-lg" />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold">{course.title}</h3>
                                            <p className="text-zinc-500 text-xs mt-1 line-clamp-1">{course.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditCourse(course)}
                                            className={`p-2 rounded-lg transition-all ${
                                                editing.type === 'course' && editing.id === course.id
                                                    ? 'bg-kiddy-primary text-white'
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
                                    <div className="px-4 pb-4 space-y-4 border-t border-zinc-900 mt-4 pt-4">
                                        {/* Форма создания модуля */}
                                        <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                                            <h4 className="text-zinc-400 text-xs font-bold uppercase mb-3">Добавить модуль</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    value={moduleForm.title}
                                                    onChange={e => setModuleForm({...moduleForm, title: e.target.value, course_id: course.id})}
                                                    placeholder="Название модуля"
                                                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-white text-sm outline-none focus:border-kiddy-primary"
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
                                            <div key={module.id} className="bg-black/30 p-4 rounded-lg border border-zinc-900">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleModuleExpanded(module.id)}
                                                            className="text-zinc-500 hover:text-white"
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
                                                    <div className="bg-zinc-900/50 p-3 rounded-lg mb-3 space-y-2">
                                                        <input
                                                            value={moduleForm.title}
                                                            onChange={e => setModuleForm({...moduleForm, title: e.target.value})}
                                                            className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={handleUpdateModule} className="flex-1 py-1.5 bg-kiddy-primary text-white text-xs font-bold rounded">
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
                                                        <div className="bg-zinc-900/30 p-3 rounded border border-zinc-800">
                                                            <h5 className="text-zinc-500 text-[10px] font-bold uppercase mb-2">Добавить урок</h5>
                                                            <div className="space-y-2">
                                                                <input
                                                                    value={lessonForm.title}
                                                                    onChange={e => setLessonForm({...lessonForm, title: e.target.value, module_id: module.id})}
                                                                    placeholder="Название урока"
                                                                    className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs"
                                                                />
                                                                <textarea
                                                                    value={lessonForm.description}
                                                                    onChange={e => setLessonForm({...lessonForm, description: e.target.value})}
                                                                    placeholder="Описание"
                                                                    className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs min-h-[60px]"
                                                                />
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        value={lessonForm.video_url}
                                                                        onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                                                                        placeholder="URL видео"
                                                                        className="flex-1 bg-black border border-zinc-800 p-2 rounded text-zinc-400 text-xs"
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
                                                                    className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs min-h-[80px]"
                                                                />
                                                                <button
                                                                    onClick={() => handleCreateLesson(module.id)}
                                                                    className="w-full py-2 bg-kiddy-primary text-white text-xs font-bold rounded hover:bg-rose-600"
                                                                >
                                                                    Создать урок
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Список уроков */}
                                                        {module.lessons?.map((lesson: any) => (
                                                            <div key={lesson.id} className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                                                                {editing.type === 'lesson' && editing.id === lesson.id ? (
                                                                    <div className="space-y-2">
                                                                        <input
                                                                            value={lessonForm.title}
                                                                            onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                                                                            className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs"
                                                                        />
                                                                        <textarea
                                                                            value={lessonForm.description}
                                                                            onChange={e => setLessonForm({...lessonForm, description: e.target.value})}
                                                                            className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs min-h-[60px]"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <input
                                                                                value={lessonForm.video_url}
                                                                                onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                                                                                className="flex-1 bg-black border border-zinc-800 p-2 rounded text-zinc-400 text-xs"
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
                                                                            className="w-full bg-black border border-zinc-800 p-2 rounded text-white text-xs min-h-[80px]"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <button onClick={handleUpdateLesson} className="flex-1 py-1.5 bg-kiddy-primary text-white text-xs font-bold rounded">
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
                                                                                <p className="text-zinc-500 text-[10px] mt-1 line-clamp-1">Задание: {lesson.homework_task}</p>
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600" size={18} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Поиск пользователей..."
                                className="w-full bg-black border border-zinc-800 pl-10 pr-4 py-3 rounded-lg text-white outline-none focus:border-kiddy-primary"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredUsers.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">
                                        {searchQuery ? 'Пользователи не найдены' : 'Пользователи не загружены. Проверьте RLS политики в Supabase.'}
                                    </p>
                                </div>
                            ) : (
                                filteredUsers.map(u => (
                                    <Card key={u.id} className="bg-black border-zinc-800 p-0 flex items-center justify-between group overflow-hidden shadow-xl" noPadding>
                                        <div className="p-4 flex items-center gap-4 flex-1">
                                            <img src={u.avatar} className="w-12 h-12 rounded-full border border-zinc-800 object-cover" alt=""/>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-white font-bold text-sm truncate">{u.name}</h4>
                                                <p className="text-zinc-600 text-[9px] uppercase tracking-tighter truncate">{u.email || 'БЕЗ_EMAIL'}</p>
                                                <p className="text-zinc-700 text-[8px] mt-1">{u.role}</p>
                                            </div>
                                        </div>
                                        <div className="pr-4">
                                            <button
                                                onClick={() => toggleUserApproval(u)}
                                                className={`p-2 rounded-lg transition-all ${u.isApproved ? 'text-green-500' : 'text-zinc-700 hover:text-white'}`}
                                            >
                                                {u.isApproved ? <Unlock size={16}/> : <Lock size={16}/>}
                                            </button>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!loading && currentView === 'settings' && (
                <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-10 overflow-y-auto no-scrollbar">
                    <div className="max-w-2xl space-y-10">
                        <div className="space-y-4">
                            <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Логотип академии</label>
                            <div className="relative group aspect-square w-40 bg-black border border-zinc-800 rounded-3xl overflow-hidden flex items-center justify-center cursor-pointer hover:border-kiddy-primary transition-colors" onClick={() => logoFileRef.current?.click()}>
                                {uploading ? <Loader2 className="animate-spin text-zinc-700" size={32} /> : globalSettings.logo_url ? <img src={globalSettings.logo_url} className="w-full h-full object-contain p-4" alt="Logo" /> : <div className="text-center p-4"><ImageIcon size={32} className="text-zinc-700 mx-auto mb-2" /><p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Загрузить</p></div>}
                                <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo')} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Название организации</label>
                            <input value={globalSettings.school_name} onChange={e => setGlobalSettings({...globalSettings, school_name: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white font-display font-bold outline-none focus:border-kiddy-primary transition-all" placeholder="Напр: Kiddy IT Academy"/>
                        </div>
                        <button onClick={handleSaveSettings} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-kiddy-primary hover:text-white transition-all shadow-xl">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
                    </div>
                </div>
            )}
        </div>
    );
};
