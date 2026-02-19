import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, User, Briefcase, Mail, Phone, Calendar, Edit2, X, Save } from 'lucide-react';
import { useAvailableSlots, useInsertAvailableSlot, useUpdateAvailableSlot } from '@/features/professional-clients/queries';
import { IAvailableSlots } from '@/features/professional-clients/types';
import { useProfessional } from '@/contexts/ProfessionalContext';
import { AvailableSlot } from '@/components/profile/availableSlot';
import { useAuthStore } from '@/store/newAuthStore';
import { useUser, useUpdateUser } from '@/features/users/queries';

const DAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 7, label: 'Domingo' }
];

const formatTimeForInput = (time: string) => {
    if (!time) return '09:00';
    if (time.includes('T')) {
        // Use Date object to correctly extract local time from ISO strings
        const date = new Date(time);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        return time.split('T')[1].substring(0, 5);
    }
    return time.substring(0, 5);
};

export function ProfilePage() {
    const { professional } = useProfessional();
    const { user } = useAuthStore();
    console.log('user',user);
    const professionalId = professional?.sub;
    
    // Fetch full user data to get name, lastname, phone, etc.
    const userId = user?.id ? parseInt(user.id) : undefined;
    const { data: fetchedUser, isLoading: isLoadingUser } = useUser(userId);
    const updateUserMutation = useUpdateUser();

    const { data: slots, isLoading: isLoadingSlots } = useAvailableSlots(professionalId || '');
    const insertMutation = useInsertAvailableSlot();
    const updateMutation = useUpdateAvailableSlot();

    const [activeTab, setActiveTab] = useState<'personal' | 'professional'>('personal');
    const [workSlots, setWorkSlots] = useState<IAvailableSlots[]>([]);
    const [savingSlots, setSavingSlots] = useState<number[]>([]);
    const [showToast, setShowToast] = useState(false);
    
    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lastname: '',
        phone_number: ''
    });

    const isSaving = insertMutation.isPending || updateMutation.isPending;
    const isUpdatingUser = updateUserMutation.isPending;

    // Derived user data - prioritize fetched data over auth store data
    // The API might return 'name' and 'lastname' separately, or a 'full_name'
    // Based on IUserProfessionalClient in types.ts: name, lastname, phone_number
    const displayFirstName = fetchedUser?.name || user?.name || user?.full_name?.split(' ')[0] || '';
    const displayLastName = fetchedUser?.lastname || user?.lastname || user?.full_name?.split(' ').slice(1).join(' ') || '';
    const displayEmail = fetchedUser?.email || user?.email || '';
    const displayPhone = fetchedUser?.phone_number || user?.phone || '';

    // Initialize form data when user data is available
    useEffect(() => {
        if (fetchedUser || user) {
            setFormData({
                name: displayFirstName,
                lastname: displayLastName,
                phone_number: displayPhone
            });
        }
    }, [fetchedUser, user, displayFirstName, displayLastName, displayPhone]);

    useEffect(() => {
        if (slots) {
            const mappedSlots = DAYS.map(day => {
                const existingSlot = slots.find(s => s.day_of_week === day.id);
                if (existingSlot) {
                    return {
                        ...existingSlot,
                        start_time: formatTimeForInput(existingSlot.start_time),
                        end_time: formatTimeForInput(existingSlot.end_time)
                    };
                }
                return {
                    day_of_week: day.id,
                    is_active: false,
                    start_time: '09:00',
                    end_time: '17:00'
                };
            });
            setWorkSlots(mappedSlots);
        } else if (!isLoadingSlots) {
            // Default state if no data yet (all disabled)
            setWorkSlots(DAYS.map(day => ({
                day_of_week: day.id,
                is_active: false,
                start_time: '09:00',
                end_time: '17:00'
            })));
        }
    }, [slots, isLoadingSlots]);

    const handleToggleDay = async (index: number) => {
        if (!professionalId) return;
        const slot = workSlots[index];
        const newIsActiveStatus = !slot.is_active;

        // Optimistic update
        const newSlots = [...workSlots];
        newSlots[index] = { ...slot, is_active: newIsActiveStatus };
        setWorkSlots(newSlots);

        setSavingSlots(prev => [...prev, slot.day_of_week]);

        try {
            if (slot.id) {
                // Update
                await updateMutation.mutateAsync({
                    id: slot.id,
                    slotData: { is_active: newIsActiveStatus }
                });
            } else {
                // Insert
                await insertMutation.mutateAsync({
                    day_of_week: slot.day_of_week,
                    is_active: newIsActiveStatus,
                    start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
                    end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time,
                    professional_id: parseInt(professionalId.toString())
                });
            }
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
            // Rollback on error
            setWorkSlots(workSlots);
            console.error('Failed to save slot:', error);
        } finally {
            setSavingSlots(prev => prev.filter(id => id !== slot.day_of_week));
        }
    };

    const handleTimeChange = async (index: number, field: 'start_time' | 'end_time', value: string, skipSave: boolean = false) => {
        const slot = workSlots[index];
        const formattedValue = value.length === 5 ? `${value}:00` : value;

        // Optimistic update
        const newSlots = [...workSlots];
        newSlots[index] = { ...slot, [field]: value };
        setWorkSlots(newSlots);

        if (skipSave) return;

        setSavingSlots(prev => [...prev, slot.day_of_week]);

        try {
            if (slot.id) {
                await updateMutation.mutateAsync({
                    id: slot.id,
                    slotData: { [field]: formattedValue }
                });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            }
        } catch (error) {
            setWorkSlots(workSlots);
            console.error('Failed to update time:', error);
        } finally {
            setSavingSlots(prev => prev.filter(id => id !== slot.day_of_week));
        }
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        
        try {
            await updateUserMutation.mutateAsync({
                id: userId,
                data: {
                    name: formData.name,
                    lastname: formData.lastname,
                    phone_number: formData.phone_number
                }
            });
            setIsEditing(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
            console.error("Failed to update profile", error);
            // Optionally add error toast here
        }
    };

    const handleCancelEdit = () => {
        // Reset form data to current display values
        setFormData({
            name: displayFirstName,
            lastname: displayLastName,
            phone_number: displayPhone
        });
        setIsEditing(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mi Perfil</h1>
                    <p className="text-gray-500 mt-1">Gestiona tu información personal y profesional.</p>
                </div>

                {/* Auto-save status indicator (Only relevant for professional tab) */}
                {activeTab === 'professional' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        {isSaving ? (
                            <div className="flex items-center gap-2 text-nutrition-600">
                                <div className="w-4 h-4 border-2 border-nutrition-600/30 border-t-nutrition-600 rounded-full animate-spin" />
                                <span className="text-xs font-bold uppercase tracking-wider">Guardando...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-nutrition-500">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Sincronizado</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1">
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                        ${activeTab === 'personal'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-gray-500 hover:bg-white/12 hover:text-white'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <User className="w-4 h-4" />
                        Información Personal
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('professional')}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                        ${activeTab === 'professional'
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-gray-500 hover:bg-white/12 hover:text-white'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Configuración Profesional
                    </div>
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'personal' ? (
                    <motion.div
                        key="personal"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {isLoadingUser ? (
                            <div className="lg:col-span-3 flex justify-center py-20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                    <p className="text-gray-400 font-medium">Cargando información...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Personal Info Card */}
                         <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <User className="w-5 h-5 text-gray-500" />
                                        Datos Básicos
                                    </h2>
                                    
                                    {!isEditing ? (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Editar
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleCancelEdit}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                disabled={isUpdatingUser}
                                            >
                                                <X className="w-4 h-4" />
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleSaveProfile}
                                                disabled={isUpdatingUser}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                {isUpdatingUser ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4" />
                                                )}
                                                Guardar
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre(s)</label>
                                        {isEditing ? (
                                            <input 
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full p-4 bg-white rounded-xl border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Tu nombre"
                                            />
                                        ) : (
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">
                                                {displayFirstName || 'No definido'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apellidos</label>
                                        {isEditing ? (
                                            <input 
                                                type="text"
                                                value={formData.lastname}
                                                onChange={(e) => setFormData({...formData, lastname: e.target.value})}
                                                className="w-full p-4 bg-white rounded-xl border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Tus apellidos"
                                            />
                                        ) : (
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">
                                                {displayLastName || 'No definido'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Correo Electrónico</label>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900">
                                            <Mail className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium">{displayEmail}</span>
                                            {user?.email_verified && (
                                                <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Verificado
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 pl-1">* El correo electrónico no se puede editar.</p>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono de Contacto</label>
                                        {isEditing ? (
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Phone className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <input 
                                                    type="tel"
                                                    value={formData.phone_number}
                                                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                                                    className="w-full p-4 pl-12 bg-white rounded-xl border border-gray-200 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="Tu número de teléfono"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-500">
                                                <Phone className="w-5 h-5 text-gray-400" />
                                                <span className={`font-medium ${!displayPhone ? 'italic' : ''}`}>
                                                    {displayPhone || 'Sin registrar'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                         {/* Side Card */}
                         <div className="lg:col-span-1 space-y-6">
                             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-50" />
                                
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white text-3xl font-bold mb-4">
                                        {displayFirstName.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">{displayFirstName} {displayLastName}</h3>
                                    <span className="inline-flex mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wide">
                                        {user?.role}
                                    </span>
                                    
                                    <div className="mt-6 w-full pt-6 border-t border-gray-100">
                                        <p className="text-xs text-center text-gray-400">
                                            Miembro desde {new Date().getFullYear()}
                                        </p>
                                    </div>
                                </div>
                             </div>
                         </div>
                            </>
                        )}

                    </motion.div>
                ) : (
                    <motion.div
                        key="professional"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* Lateral Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <motion.div
                                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
                            >
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-nutrition-600" />
                                    Horarios de Trabajo
                                </h2>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Define los intervalos de tiempo en los que estarás disponible para recibir sesiones. Estos horarios se reflejarán en tu calendario de agenda.
                                </p>

                                <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 leading-normal">
                                        Los cambios realizados aquí actualizarán automáticamente los espacios disponibles en el dashboard de nutrición.
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Main Content: Work Slots */}
                        <div className="lg:col-span-2 space-y-4">
                            {isLoadingSlots ? (
                                /* Skeleton Loader */
                                Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="p-6 bg-white border border-gray-100 rounded-3xl animate-pulse">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-6 bg-gray-200 rounded-full" />
                                                <div className="w-20 h-4 bg-gray-200 rounded-md" />
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-20 h-10 bg-gray-200 rounded-xl" />
                                                <div className="w-20 h-10 bg-gray-200 rounded-xl" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                workSlots.map((slot, index) => (
                                    <AvailableSlot
                                        key={slot.day_of_week}
                                        slot={slot}
                                        index={index}
                                        isSaving={savingSlots.includes(slot.day_of_week)}
                                        dayName={DAYS[index].label}
                                        handleToggleDay={handleToggleDay}
                                        handleTimeChange={handleTimeChange}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 20, x: "-50%" }}
                        className="fixed bottom-10 left-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md"
                    >
                        <div className="w-8 h-8 rounded-full bg-nutrition-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-nutrition-400" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Cambios guardados</p>
                            <p className="text-gray-400 text-xs text-nowrap">Tus horarios se han actualizado correctamente.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

