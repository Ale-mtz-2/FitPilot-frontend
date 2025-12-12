import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClientCard } from '../../components/nutrition/ClientCard';
import { ArrowUpDown, Search } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  nextAppointment: string | null;
  serviceType?: string;
  // Add other fields if needed for future use
}

export function NutritionClientsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  // In a real app, you might fetch this via React Query or similar
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3001/clients')
    .then(response => {
      setClients(response.data);
    })
    .catch(error => {
      console.error('Error fetching clients:', error);
    });
  }, []);

  const filteredClients = clients
    .filter(client => 
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === 'all' || client.serviceType === filterType)
    )
    .sort((a, b) => {
      if (!a.nextAppointment) return 1; // Nulls at the end
      if (!b.nextAppointment) return -1;
      
      const dateA = new Date(a.nextAppointment).getTime();
      const dateB = new Date(b.nextAppointment).getTime();
      
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('nutritionClients', 'Clientes')}
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona seguimiento de nutrición y entrenamiento de tus clientes.
          </p>
        </div>

        {/* Search Bar & Filter */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex gap-2 w-full md:w-auto flex-1">
                <div className="relative flex-1 md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar clientes..."
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-4 py-2 hover:cursor-pointer bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shrink-0"
                    title="Ordenar por fecha de próxima cita"
                >
                    <ArrowUpDown className="h-4 w-4 text-emerald-600 " />
                    <span className="hidden sm:inline">
                        {sortOrder === 'asc' ? 'Cita más próxima' : 'Cita más lejana'}
                    </span>
                </button>
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                 <button
                    onClick={() => setFilterType('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                        filterType === 'all' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilterType('Nutrition')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                        filterType === 'Nutrition' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Nutrición
                </button>
                 <button
                    onClick={() => setFilterType('Coaching')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                        filterType === 'Coaching' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Coaching
                </button>
                 <button
                    onClick={() => setFilterType('Nutrition & Coaching')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                        filterType === 'Nutrition & Coaching' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Ambos
                </button>
            </div>
      </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            image={client.avatar}
            clientName={`${client.firstName} ${client.lastName}`}
            nextAppointment={client.nextAppointment}
            serviceType={client.serviceType}
            onAction={() => navigate(`/nutrition/clients/${client.id}`)}
          />
        ))}
      </div>
      
       {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron clientes.</p>
          </div>
        )}
    </div>
  );
}
