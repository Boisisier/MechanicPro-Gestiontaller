import { useEffect, useState } from 'react';

import { Edit2, Trash2, Search, AlertCircle, Send, FileDown } from 'lucide-react';

import type { Vehicle } from '../../lib/types';
import ConfirmDialog from '../ui/ConfirmDialog';



interface VehicleTableProps {

  vehicles: Vehicle[];

  onEdit?: (vehicle: Vehicle) => void;

  onDelete?: (id: string) => void;

  onNotify?: (vehicle: Vehicle) => void;

  onExportPdf?: (vehicle: Vehicle) => void;

  showEdit?: boolean;

  showDelete?: boolean;

  title?: string;

  pageSize?: number;

  enableDateFilter?: boolean;

}



export default function VehicleTable({

  vehicles,

  onEdit,

  onDelete,

  onNotify,

  onExportPdf,

  showEdit = true,

  showDelete = true,

  title = 'vehículos registrados',

  pageSize,

  enableDateFilter = false,

}: VehicleTableProps) {

  const [searchTerm, setSearchTerm] = useState('');

  const [dateFrom, setDateFrom] = useState('');

  const [dateTo, setDateTo] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<Vehicle | null>(null);

  const [currentPage, setCurrentPage] = useState(1);



  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  const filteredvehicles = vehicles.filter((vehicle) => {

    const matchesSearch =
      vehicle.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (!enableDateFilter || (fromTime === null && toTime === null)) {
      return true;
    }

    const vehicleTime = new Date(vehicle.fecha_ingreso).getTime();
    if (Number.isNaN(vehicleTime)) {
      return false;
    }

    if (fromTime !== null && vehicleTime < fromTime) {
      return false;
    }

    if (toTime !== null && vehicleTime > toTime) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, vehicles.length, pageSize]);

  const paginationEnabled = Boolean(pageSize && pageSize > 0);
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(filteredvehicles.length / pageSize!))
    : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = paginationEnabled ? (safeCurrentPage - 1) * pageSize! : 0;
  const visibleVehicles = paginationEnabled
    ? filteredvehicles.slice(startIndex, startIndex + pageSize!)
    : filteredvehicles;
  const visibleFrom = filteredvehicles.length === 0 ? 0 : startIndex + 1;
  const visibleTo = paginationEnabled
    ? Math.min(startIndex + pageSize!, filteredvehicles.length)
    : filteredvehicles.length;



  const handleDelete = (vehicle: Vehicle) => {

    if (!onDelete) {

      return;

    }

    setDeleteConfirm(vehicle);

  };



  const getDisplayEstado = (vehicle: Vehicle) =>
    vehicle.en_estacionamiento_manual ? 'Estacionamiento' : vehicle.estado;



  const getEstadoBadge = (estado: string) => {

    const badges = {

      Ingresado: 'bg-orange-100 text-orange-700 border-orange-200',

      'En Taller': 'bg-amber-100 text-amber-700 border-amber-200',

      Entregado: 'bg-green-100 text-green-700 border-green-200',

      Estacionamiento: 'bg-[#0f4471]/10 text-[#0f4471] border-[#0f4471]/25',

    };

    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200';

  };

  const formatDate = (dateValue?: string) => {

    if (!dateValue) {

      return '-';

    }

    return new Date(dateValue).toLocaleDateString('es-ES', {

      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

    });

  };



  return (

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Eliminar vehículo"
        message={`Se eliminará ${deleteConfirm?.patente || 'este vehículo'} del registro. Esta acción no se puede deshacer desde la pantalla actual.`}
        confirmLabel="Eliminar vehículo"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm && onDelete) {
            onDelete(deleteConfirm.id);
          }
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      <div className="p-6 border-b border-gray-200">

        <div className="flex items-center justify-between mb-4">

          <div>

            <h3 className="text-xl font-bold text-gray-900">{title}</h3>

            <p className="text-sm text-gray-500 mt-1">{filteredvehicles.length} vehículos encontrados</p>

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

        {enableDateFilter && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Fecha de ingreso desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none focus:ring-2 focus:ring-[#0f4471]/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Fecha de ingreso hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4471] focus:outline-none focus:ring-2 focus:ring-[#0f4471]/15"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Limpiar fechas
            </button>
          </div>
        )}

      </div>



      {filteredvehicles.length === 0 ? (

        <div className="p-12 text-center">

          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />

          <p className="text-gray-500 text-lg font-medium">No hay vehículos registrados</p>

          <p className="text-gray-400 text-sm mt-2">

            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza registrando tu primer vehículo'}

          </p>

        </div>

      ) : (

        <>
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

                  Año

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Tipo

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Estado

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Mecánico responsable

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Fecha ingreso

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Fecha salida

                </th>

                {(showEdit || showDelete || onNotify || onExportPdf) && (

                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Acciones

                </th>

              )}

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {visibleVehicles.map((vehicle) => {

                const displayEstado = getDisplayEstado(vehicle);

                return (

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

                        displayEstado

                      )}`}

                    >

                      {displayEstado}

                    </span>

                  </td>

                  <td className="px-6 py-4 text-gray-700">

                    <span className="font-medium text-gray-900">
                      {vehicle.assigned_mechanic_name || 'Sin asignar'}
                    </span>

                  </td>

                  <td className="px-6 py-4 text-gray-700">

                    {formatDate(vehicle.fecha_ingreso)}

                  </td>

                  <td className="px-6 py-4 text-gray-700">

                    {vehicle.estado === 'Entregado'
                      ? formatDate(vehicle.fecha_salida_confirmada || vehicle.updated_at)
                      : '-'}

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

                            onClick={() => handleDelete(vehicle)}

                            className={`p-2 rounded-lg transition-colors ${

                              deleteConfirm?.id === vehicle.id

                                ? 'bg-red-100 text-[#b42318]'

                                : 'text-[#fc3d3c] hover:bg-[#fc3d3c]/10'

                            }`}

                            title="Eliminar"

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
                );
              })}

            </tbody>

          </table>

        </div>
        {paginationEnabled && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {visibleFrom}-{visibleTo} de {filteredvehicles.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="min-w-24 text-center text-sm font-semibold text-gray-700">
                Pagina {safeCurrentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
        </>

      )}

    </div>

  );

}



