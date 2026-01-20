import { useState } from 'react';

import { Edit2, Trash2, Search, AlertCircle, Send, FileDown } from 'lucide-react';

import type { Vehicle } from '../lib/types';



interface VehicleTableProps {

  vehicles: Vehicle[];

  onEdit?: (vehicle: Vehicle) => void;

  onDelete?: (id: string) => void;

  onNotify?: (vehicle: Vehicle) => void;

  onExportPdf?: (vehicle: Vehicle) => void;

  showEdit?: boolean;

  showDelete?: boolean;

  title?: string;

}



export default function VehicleTable({

  vehicles,

  onEdit,

  onDelete,

  onNotify,

  onExportPdf,

  showEdit = true,

  showDelete = true,

  title = 'veh?culos registrados',

}: VehicleTableProps) {

  const [searchTerm, setSearchTerm] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);



  const filteredvehicles = vehicles.filter((vehicle) =>

    vehicle.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||

    vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||

    vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase())

  );



  const handleDelete = (id: string) => {

    if (!onDelete) {

      return;

    }

    if (deleteConfirm === id) {

      onDelete(id);

      setDeleteConfirm(null);

    } else {

      setDeleteConfirm(id);

      setTimeout(() => setDeleteConfirm(null), 3000);

    }

  };



  const getEstadoBadge = (estado: string) => {

    const badges = {

      'En taller': 'bg-orange-100 text-orange-700 border-orange-200',

      'En revision': 'bg-amber-100 text-amber-700 border-amber-200',

      Entregado: 'bg-green-100 text-green-700 border-green-200',

    };

    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200';

  };



  return (

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

      <div className="p-6 border-b border-gray-200">

        <div className="flex items-center justify-between mb-4">

          <div>

            <h3 className="text-xl font-bold text-gray-900">{title}</h3>

            <p className="text-sm text-gray-500 mt-1">{filteredvehicles.length} veh?culos encontrados</p>

          </div>

        </div>



        <div className="relative">

          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />

          <input

            type="text"

            placeholder="Buscar por patente, marca o modelo..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

          />

        </div>

      </div>



      {filteredvehicles.length === 0 ? (

        <div className="p-12 text-center">

          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />

          <p className="text-gray-500 text-lg font-medium">No hay veh?culos registrados</p>

          <p className="text-gray-400 text-sm mt-2">

            {searchTerm ? 'Intenta con otro trmino de bsqueda' : 'Comienza registrando tu primer vehculo'}

          </p>

        </div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50 border-b border-gray-200">

              <tr>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Patente

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Marca / Modelo

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Ao

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Tipo

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Estado

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Fecha ingreso

                </th>

                {(showEdit || showDelete || onNotify || onExportPdf) && (

                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Acciones

                </th>

              )}

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {filteredvehicles.map((vehicle) => (

                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">

                  <td className="px-6 py-4">

                    <span className="font-semibold text-gray-900 uppercase">{vehicle.patente}</span>

                  </td>

                  <td className="px-6 py-4">

                    <div>

                      <p className="font-medium text-gray-900">{vehicle.marca}</p>

                      <p className="text-sm text-gray-500">{vehicle.modelo}</p>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-gray-700">{vehicle.ano}</td>

                  <td className="px-6 py-4 text-gray-700">{vehicle.tipo_vehiculo}</td>

                  <td className="px-6 py-4">

                    <span

                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getEstadoBadge(

                        vehicle.estado

                      )}`}

                    >

                      {vehicle.estado}

                    </span>

                  </td>

                  <td className="px-6 py-4 text-gray-700">

                    {new Date(vehicle.fecha_ingreso).toLocaleDateString('es-ES', {

                      day: '2-digit',

                      month: '2-digit',

                      year: 'numeric',

                    })}

                  </td>

                  {(showEdit || showDelete || onNotify || onExportPdf) && (

                    <td className="px-6 py-4">

                      <div className="flex items-center justify-center gap-2">

                        {showEdit && onEdit && (

                          <button

                            onClick={() => onEdit(vehicle)}

                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"

                            title="Editar"

                          >

                            <Edit2 className="w-4 h-4" />

                          </button>

                        )}

                        {showDelete && onDelete && (

                          <button

                            onClick={() => handleDelete(vehicle.id)}

                            className={`p-2 rounded-lg transition-colors ${

                              deleteConfirm === vehicle.id

                                ? 'bg-red-100 text-red-700'

                                : 'text-red-600 hover:bg-red-50'

                            }`}

                            title={deleteConfirm === vehicle.id ? 'Confirmar eliminacin' : 'Eliminar'}

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        )}

                        {onNotify && (

                          <button

                            onClick={() => onNotify(vehicle)}

                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"

                            title="Enviar aviso"

                          >

                            <Send className="w-4 h-4" />

                          </button>

                        )}

                        {onExportPdf && (

                          <button

                            onClick={() => onExportPdf(vehicle)}

                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"

                            title="Exportar PDF"

                          >

                            <FileDown className="w-4 h-4" />

                          </button>

                        )}

                      </div>

                    </td>

                  )}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}



