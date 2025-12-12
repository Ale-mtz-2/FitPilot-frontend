import { useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, MoreHorizontal } from 'lucide-react';
import clientsData from '../../../clients.json';
import { useNavigate } from 'react-router-dom';
import { X, Search, Plus, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  nextAppointment: string | null;
}

interface Appointment {
  clientId: string;
  clientName: string;
  clientAvatar: string;
  date: Date;
  time: string;
}

export function NutritionDashboardPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDateForAppointment, setSelectedDateForAppointment] = useState<Date>(new Date());
  const [isDateConfirmed, setIsDateConfirmed] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

  // Extract/Initialize appointments
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('fitpilot_appointments');
    if (saved) {
        try {
            return JSON.parse(saved).map((app: any) => ({
                ...app,
                date: new Date(app.date)
            }));
        } catch (e) {
            console.error("Failed to parse appointments", e);
        }
    }

    const apps: Appointment[] = [];
    
    // Process clients.json
    // @ts-ignore
    const clientsList = clientsData.clients || clientsData;
    
    if (Array.isArray(clientsList)) {
        clientsList.forEach((client: Client) => {
            if (client.nextAppointment) {
                const date = new Date(client.nextAppointment);
                apps.push({
                    clientId: client.id,
                    clientName: `${client.firstName} ${client.lastName}`,
                    clientAvatar: client.avatar,
                    date: date,
                    time: format(date, 'HH:mm')
                });
            }
        });
    }

    // Add some mock appointments for the current month if real data is sparse, 
    // just to demonstrate the "multiple appointments" feature
    const today = new Date();
    // Add a mock appointment for "tomorrow"
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0);
    
    // Only add if it doesn't duplicate too much logic, but for demo:
    apps.push({
        clientId: 'mock-1',
        clientName: 'Demo Paciente 1',
        clientAvatar: 'https://ui-avatars.com/api/?name=Demo+1&background=random',
        date: tomorrow,
        time: '10:00'
    });
     apps.push({
        clientId: 'mock-2',
        clientName: 'Demo Paciente 2',
        clientAvatar: 'https://ui-avatars.com/api/?name=Demo+2&background=random',
        date: tomorrow,
        time: '11:30'
    });

    return apps;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('fitpilot_appointments', JSON.stringify(appointments));
  }, [appointments]);

  const handleConfirmAppointment = () => {
      if (selectedTime && selectedClient) {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          const appDate = new Date(selectedDateForAppointment);
          appDate.setHours(hours, minutes, 0, 0);

          const newApp: Appointment = {
              clientId: selectedClient.id,
              clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
              clientAvatar: selectedClient.avatar,
              date: appDate,
              time: selectedTime
          };

          setAppointments(prev => [...prev, newApp]);
          
          setIsAddModalOpen(false);
          setSelectedClient(null);
          setSelectedTime(null);
          setToastMessage('Cita agregada correctamente');
          setShowSuccessToast(true);
      }
  };

  const confirmDelete = () => {
    if (appointmentToDelete) {
        setAppointments(prev => prev.filter(a => 
            a.clientId !== appointmentToDelete.clientId || 
            a.date.getTime() !== appointmentToDelete.date.getTime()
        ));
        setAppointmentToDelete(null);
        setToastMessage('Se ha eliminado la cita correctamente');
        setShowSuccessToast(true);
    }
  };

  useEffect(() => {
    if (showSuccessToast) {
        const timer = setTimeout(() => setShowSuccessToast(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => isSameDay(app.date, day));
  };

  const getBookedTimesForDay = (day: Date) => {
    return getAppointmentsForDay(day).map(app => app.time);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: es }); // Start on Monday usually in ES, but date-fns defaults to Sunday unless configured. Let's stick to standard.
  const endDate = endOfWeek(monthEnd, { locale: es });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
       {/* Success Toast */}
       <AnimatePresence>
            {showSuccessToast && (
                <motion.div
                    initial={{ opacity: 0, y: -20, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: -20, x: "-50%" }}
                     className="fixed top-6 left-1/2 z-[100] flex items-center gap-3 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg shadow-emerald-200"
                >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{toastMessage}</span>
                </motion.div>
            )}
       </AnimatePresence>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Nutricional</h1>
            <p className="text-gray-500">Resumen de agenda y actividades</p>
        </div>
        <div className="flex items-center gap-3">
             <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                 Hoy
             </button>
              <button 
                  onClick={() => {
                      setSelectedDateForAppointment(new Date());
                      setIsDateConfirmed(false);
                      setIsAddModalOpen(true);
                  }}
                 className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2"
             >
                 <CalendarIcon className="w-4 h-4" />
                 Nueva Cita
             </button>
        </div>
      </div>

      {/* Calendar Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Calendar Header */}
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                {calendarDays.map((day) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    const hasAppointments = dayAppointments.length > 0;
                    const isSelectedMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div 
                            key={day.toString()} 
                            onClick={() => {
                                setSelectedDateForAppointment(day);
                                setIsDateConfirmed(true);
                                setIsAddModalOpen(true);
                                setHoveredDate(null);
                            }}
                            className="relative flex flex-col items-center group cursor-pointer"
                            onMouseEnter={() => setHoveredDate(day)}
                            onMouseLeave={() => setHoveredDate(null)}
                        >
                            <div className={`
                                w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-sm font-medium transition-all duration-300 relative
                                ${isSelectedMonth ? 'text-gray-700' : 'text-gray-300'}
                                ${isTodayDate ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'hover:bg-gray-50'}
                                ${hasAppointments && !isTodayDate ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}
                            `}>
                                {format(day, 'd')}
                                
                                {/* Dot Indicator for appointments */}
                                {hasAppointments && !isTodayDate && (
                                    <div className="absolute bottom-2 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500" />
                                )}
                                {hasAppointments && isTodayDate && (
                                     <div className="absolute bottom-2 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/70" />
                                )}
                            </div>

                            {/* Dropdown / Popover on Hover */}
                            <AnimatePresence>
                                {hoveredDate && isSameDay(hoveredDate, day) && hasAppointments && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 pointer-events-none md:pointer-events-auto"
                                    >
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                                            Citas del {format(day, 'd MMM', { locale: es })}
                                        </div>
                                        <div className="space-y-2">
                                            {dayAppointments.map((appt, i) => (
                                                <div className="group/item relative">
                                                <button 
                                                    key={i} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/nutrition/clients/${appt.clientId}`);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
                                                >
                                                    <img src={appt.clientAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-gray-100" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate group-hover/item:text-emerald-700 transition-colors">{appt.clientName}</p>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Clock className="w-3 h-3" />
                                                            {appt.time}
                                                        </div>
                                                    </div>
                                                </button>
                                                {/* Delete Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAppointmentToDelete(appt);
                                                        setHoveredDate(null);
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all opacity-0 group-hover/item:opacity-100 shadow-sm cursor-pointer"
                                                    title="Eliminar cita"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-gray-50 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDateForAppointment(day);
                                                    setIsDateConfirmed(true);
                                                    setIsAddModalOpen(true);
                                                    setHoveredDate(null);
                                                }}
                                                className="text-xs text-emerald-600 font-medium cursor-pointer hover:underline flex items-center justify-center gap-1 w-full"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Agregar nueva cita
                                            </button>
                                        </div>
                                        
                                        {/* Little Arrow */}
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-100 transform rotate-45" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
      </motion.div>

      {/* Quick Stats Row (Optional but nice for a dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-600">
                  <Clock className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500">Próxima Cita</p>
                  <p className="text-lg font-bold text-gray-900">Hoy, 14:30</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                  <User className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500">Pacientes Activos</p>
                  <p className="text-lg font-bold text-gray-900">42</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                  <MoreHorizontal className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-gray-500">Solicitudes Nuevas</p>
                  <p className="text-lg font-bold text-gray-900">5 Pendiendes</p>
              </div>
          </div>
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                onClick={() => setIsAddModalOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100"
                >
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Agendar Nueva Cita</h2>
                            <p className="text-sm text-gray-500">Selecciona un cliente para continuar</p>
                        </div>
                        <button 
                            onClick={() => setIsAddModalOpen(false)}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        {!selectedClient ? (
                            <>
                                {/* Step 1: Search Client */}
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar cliente por nombre..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {(clientsData.clients || []).filter((c: any) => 
                                        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).map((client: any) => (
                                        <button
                                            key={client.id}
                                            onClick={() => setSelectedClient(client)}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group text-left"
                                        >
                                            <img src={client.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{client.firstName} {client.lastName}</p>
                                                <p className="text-xs text-gray-500">{client.email}</p>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                AGENDAR
                                            </div>
                                        </button>
                                    ))}
                                    
                                     {(clientsData.clients || []).filter((c: any) => 
                                        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            <p>No se encontraron clientes</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : !isDateConfirmed ? (
                             <>
                                {/* Step 2: Select Date */}
                                <div className="mb-6 flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                                    <img src={selectedClient.avatar} alt="" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</p>
                                        <p className="text-xs text-emerald-700">Seleccionando fecha</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedClient(null)}
                                        className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de la Cita</label>
                                    <input 
                                        type="date" 
                                        value={format(selectedDateForAppointment, 'yyyy-MM-dd')}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const [y, m, d] = e.target.value.split('-').map(Number);
                                                setSelectedDateForAppointment(new Date(y, m - 1, d));
                                            }
                                        }}
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Selecciona el día para ver los horarios disponibles.</p>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setSelectedClient(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Atrás
                                    </button>
                                    <button 
                                        onClick={() => setIsDateConfirmed(true)}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                                    >
                                        Continuar
                                    </button>
                                </div>
                             </>
                        ) : (
                            <>
                                {/* Step 3: Select Time */}
                                <div className="mb-6 flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                                    <img src={selectedClient.avatar} alt="" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</p>
                                        <p className="text-xs text-emerald-700">Seleccionando horario para el {format(selectedDateForAppointment, 'dd/MM/yyyy')}</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsDateConfirmed(false)}
                                        className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <div className="grid grid-cols-4 gap-2 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar">
                                    {timeSlots.map(time => {
                                        const isBooked = getBookedTimesForDay(selectedDateForAppointment).includes(time); // Note: accurate checking requires comparing actual dates too, but for this mock 'currentDate' implies the month view's current date? No, we need selected date. 
                                        // Wait, the modal is global. If I click "New Appointment" it defaults to... which day?
                                        // The user flow: Calendar -> Hover Day -> "Add Appointment". I should capture THAT day.
                                        // If using global button "New Appointment", maybe today?
                                        // Let's use `hoveredDate` if available, else `currentDate` (which is first of month usually? No, `currentDate` is state for calendar view).
                                        // Actually `currentDate` tracks the VIEW month, not selected day.
                                        // I should add `selectedDate` state to modal or use `hoveredDate`.
                                        // Better: When opening modal, pass the target date.
                                        // For now, I will use `hoveredDate || new Date()` inside the map.
                                        
                                        // But `hoveredDate` is cleared on mouse leave? 
                                        // Ah, in `onClick` of "Add Appointment" in popover, I set `setHoveredDate(null)`. I need to persist the date.
                                        // I'll assume for this specific edit I need to fix the date logic too?
                                        // The user request is about the "Red" styling.
                                        
                                        // Let's ensure I use the right date. I will use a new state `selectedDateForAppointment`.
                                        return (
                                            <button
                                                key={time}
                                                disabled={isBooked}
                                                onClick={() => setSelectedTime(time)}
                                                className={`
                                                    py-2 rounded-lg text-sm font-medium transition-all
                                                    ${isBooked 
                                                        ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100' 
                                                        : selectedTime === time
                                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                                            : 'bg-gray-50 text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200'
                                                    }
                                                `}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsDateConfirmed(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Atrás
                                    </button>
                                    <button 
                                        disabled={!selectedTime}
                                        onClick={handleConfirmAppointment}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirmar Cita
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {appointmentToDelete && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-xs z-[60] flex items-center justify-center p-4"
                onClick={() => setAppointmentToDelete(null)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100"
                >
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar Cita</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            ¿Estás seguro que deseas eliminar la cita con <span className="font-semibold text-gray-900">{appointmentToDelete.clientName}</span>? Esta acción no se puede deshacer.
                        </p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setAppointmentToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
