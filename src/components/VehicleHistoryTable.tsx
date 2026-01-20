import { useMemo, useState } from 'react';

import { Search } from 'lucide-react';

import type { Vehicle } from '../lib/types';



interface VehicleHistoryTableProps {

  vehicles: Vehicle[];

}



export default function VehicleHistoryTable({ vehicles }: VehicleHistoryTableProps) {

  const [patente, setPatente] = useState('');

  const [fromDate, setFromDate] = useState('');

  const [toDate, setToDate] = useState('');



  const escapeHtml = (value: string) =>

    value

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#39;');



  const filteredvehicles = useMemo(() => {

    return vehicles.filter((vehicle) => {

      if (patente && !vehicle.patente.toLowerCase().includes(patente.toLowerCase())) {

        return false;

      }

      const ingreso = new Date(vehicle.fecha_ingreso);

      if (fromDate) {

        const from = new Date(fromDate);

        if (ingreso < from) {

          return false;

        }

      }

      if (toDate) {

        const to = new Date(toDate);

        to.setHours(23, 59, 59, 999);

        if (ingreso > to) {

          return false;

        }

      }

      return true;

    });

  }, [vehicles, patente, fromDate, toDate]);



  const handleExportPdf = () => {

    const rowsHtml = filteredvehicles

      .map((vehicle) => {

        const ingreso = new Date(vehicle.fecha_ingreso).toLocaleDateString('es-ES', {

          day: '2-digit',

          month: '2-digit',

          year: 'numeric',

        });

        return `

          <tr>

            <td>${escapeHtml(vehicle.patente)}</td>

            <td>${escapeHtml(vehicle.marca)}</td>

            <td>${escapeHtml(vehicle.modelo)}</td>

            <td>${vehicle.ano}</td>

            <td>${escapeHtml(vehicle.tipo_vehiculo)}</td>

            <td>${vehicle.kilometraje}</td>

            <td>${escapeHtml(vehicle.estado)}</td>

            <td>${escapeHtml(ingreso)}</td>

            <td>${escapeHtml(vehicle.observaciones?.trim() || 'Sin observaciones')}</td>

          </tr>

        `;

      })

      .join('');



    const filters = [

      patente ? `Patente: ${patente}` : null,

      fromDate ? `Desde: ${fromDate}` : null,

      toDate ? `Hasta: ${toDate}` : null,

    ]

      .filter(Boolean)

      .join(' | ');



    const html = `

      <html>

        <head>

          <title>Historial de vehculos</title>

          <style>

            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }

            h1 { font-size: 20px; margin-bottom: 4px; }

            p { margin: 0 0 12px; font-size: 12px; color: #6b7280; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; }

            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }

            th { background: #f9fafb; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }

          </style>

        </head>

        <body>

          <h1>Historial de vehculos</h1>

          <p>${filters ? escapeHtml(filters) : 'Sin filtros aplicados'}</p>

          <p>Total registros: ${filteredvehicles.length}</p>

          <table>

            <thead>

              <tr>

                <th>Patente</th>

                <th>Marca</th>

                <th>Modelo</th>

                <th>Ao</th>

                <th>Tipo</th>

                <th>Kilometraje</th>

                <th>Estado</th>

                <th>Fecha ingreso</th>

                <th>Trabajo realizado</th>

              </tr>

            </thead>

            <tbody>

              ${rowsHtml || '<tr><td colspan="9">Sin registros</td></tr>'}

            </tbody>

          </table>

        </body>

      </html>

    `;



    const printWindow = window.open('', '_blank', 'width=1000,height=700');

    if (!printWindow) {

      return;

    }

    printWindow.document.open();

    printWindow.document.write(html);

    printWindow.document.close();

    printWindow.focus();

    printWindow.print();

  };



  return (

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

      <div className="p-6 border-b border-gray-200 space-y-4">

        <div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">Historial de vehculos</h3>

              <p className="text-sm text-gray-500 mt-1">

                {filteredvehicles.length} registros encontrados

              </p>

            </div>

            <button

              type="button"

              onClick={handleExportPdf}

              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"

            >

              Exportar PDF

            </button>

          </div>

        </div>



        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="relative">

            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

            <input

              type="text"

              placeholder="Buscar por patente..."

              value={patente}

              onChange={(event) => setPatente(event.target.value)}

              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

            />

          </div>

          <input

            type="date"

            value={fromDate}

            onChange={(event) => setFromDate(event.target.value)}

            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

          />

          <input

            type="date"

            value={toDate}

            onChange={(event) => setToDate(event.target.value)}

            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

          />

        </div>

      </div>



      {filteredvehicles.length === 0 ? (

        <div className="p-12 text-center text-gray-500">No hay registros para los filtros actuales.</div>

      ) : (

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50 border-b border-gray-200">

              <tr>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Patente

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  vehculo

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Estado

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Fecha ingreso

                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                  Trabajo realizado

                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-200">

              {filteredvehicles.map((vehicle) => (

                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">

                  <td className="px-6 py-4 font-semibold text-gray-900 uppercase">

                    {vehicle.patente}

                  </td>

                  <td className="px-6 py-4">

                    <div>

                      <p className="font-medium text-gray-900">{vehicle.marca}</p>

                      <p className="text-sm text-gray-500">{vehicle.modelo}</p>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-gray-700">{vehicle.estado}</td>

                  <td className="px-6 py-4 text-gray-700">

                    {new Date(vehicle.fecha_ingreso).toLocaleDateString('es-ES', {

                      day: '2-digit',

                      month: '2-digit',

                      year: 'numeric',

                    })}

                  </td>

                  <td className="px-6 py-4 text-gray-700">

                    {vehicle.observaciones?.trim() ? vehicle.observaciones : 'Sin observaciones'}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}



