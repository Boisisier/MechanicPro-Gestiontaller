import { useEffect, useState } from 'react';

import { Save, RotateCcw } from 'lucide-react';



interface VehicleFormProps {

  onSubmit: (data: VehicleFormData) => Promise<void>;

  editingVehicle?: VehicleFormData & { id: string } | null;

  onCancelEdit?: () => void;

}



export interface VehicleFormData {

  patente: string;

  marca: string;

  modelo: string;

  ano: number;

  tipo_vehiculo: string;

  kilometraje: number;

  cantidad_combustible: number;

  estado: 'En taller' | 'Entregado' | 'En revision';

  customer_name: string;

  customer_rut: string;

  customer_phone: string;

  customer_address: string;

  customer_city: string;

  observaciones: string;

}



const initialFormData: VehicleFormData = {

  patente: '',

  marca: '',

  modelo: '',

  ano: new Date().getFullYear(),

  tipo_vehiculo: 'Auto',

  kilometraje: 0,

  cantidad_combustible: 0,

  estado: 'En taller',

  customer_name: '',

  customer_rut: '',

  customer_phone: '',

  customer_address: '',

  customer_city: '',

  observaciones: '',

};



export default function VehicleForm({ onSubmit, editingVehicle, onCancelEdit }: VehicleFormProps) {

  const [formData, setFormData] = useState<VehicleFormData>(editingVehicle || initialFormData);

  const [isSubmitting, setIsSubmitting] = useState(false);



  useEffect(() => {

    if (editingVehicle) {

      const { id, ...data } = editingVehicle;

      setFormData(data);

    } else {

      setFormData(initialFormData);

    }

  }, [editingVehicle]);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {

    const { name, value } = e.target;

    setFormData((prev) => ({

      ...prev,

      [name]: ['ano', 'kilometraje', 'cantidad_combustible'].includes(name)

        ? parseInt(value) || 0

        : value,

    }));

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setIsSubmitting(true);

    try {

      await onSubmit(formData);

      if (!editingVehicle) {

        setFormData(initialFormData);

      }

    } finally {

      setIsSubmitting(false);

    }

  };



  const handleClear = () => {

    setFormData(initialFormData);

    if (onCancelEdit) {

      onCancelEdit();

    }

  };



  return (

    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">

      <div className="mb-6">

        <h3 className="text-xl font-bold text-gray-900">

          {editingVehicle ? 'Editar vehculo' : 'Registro de vehculo'}

        </h3>

        <p className="text-sm text-gray-500 mt-1">Complete los datos del vehculo</p>

      </div>



      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>

            <label htmlFor="patente" className="block text-sm font-medium text-gray-700 mb-2">

              Patente *

            </label>

            <input

              type="text"

              id="patente"

              name="patente"

              value={formData.patente}

              onChange={handleChange}

              required

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"

              placeholder="ABC123"

            />

          </div>



          <div>

            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-2">

              Marca *

            </label>

            <input

              type="text"

              id="marca"

              name="marca"

              value={formData.marca}

              onChange={handleChange}

              required

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

              placeholder="Toyota, Ford, etc."

            />

          </div>



          <div>

            <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-2">

              Modelo *

            </label>

            <input

              type="text"

              id="modelo"

              name="modelo"

              value={formData.modelo}

              onChange={handleChange}

              required

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

              placeholder="Corolla, Focus, etc."

            />

          </div>



          <div>

            <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-2">Ao *</label>

            <input

              type="number"

              id="ano"

              name="ano"

              value={formData.ano}

              onChange={handleChange}

              required

              min="1900"

              max={new Date().getFullYear() + 1}

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

            />

          </div>



          <div>

            <label htmlFor="tipo_vehiculo" className="block text-sm font-medium text-gray-700 mb-2">Tipo de vehculo *</label>

            <select

              id="tipo_vehiculo"

              name="tipo_vehiculo"

              value={formData.tipo_vehiculo}

              onChange={handleChange}

              required

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

            >

              <option value="Auto">Auto</option>

              <option value="Camioneta">Camioneta</option>

              <option value="SUV">SUV</option>

              <option value="Moto">Moto</option>

              <option value="Camion">Camion</option>

              <option value="Furgon">Furgn</option>

            </select>

          </div>



          <div>

            <label htmlFor="kilometraje" className="block text-sm font-medium text-gray-700 mb-2">

              Kilometraje

            </label>

            <input

              type="number"

              id="kilometraje"

              name="kilometraje"

              value={formData.kilometraje}

              onChange={handleChange}

              min="0"

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

              placeholder="0"

            />

          </div>



          <div>

            <label

              htmlFor="cantidad_combustible"

              className="block text-sm font-medium text-gray-700 mb-2"

            >

              Cantidad de combustible (%)

            </label>

            <input

              type="number"

              id="cantidad_combustible"

              name="cantidad_combustible"

              value={formData.cantidad_combustible}

              onChange={handleChange}

              min="0"

              max="100"

              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

              placeholder="0"

            />

          </div>

        </div>



        <div className="border-t border-gray-200 pt-6">

          <h4 className="text-sm font-semibold text-gray-900 mb-4">Datos del cliente</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>

              <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-2">

                Nombre

              </label>

              <input

                type="text"

                id="customer_name"

                name="customer_name"

                value={formData.customer_name}

                onChange={handleChange}

                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

                placeholder="Nombre del cliente"

              />

            </div>

            <div>

              <label htmlFor="customer_rut" className="block text-sm font-medium text-gray-700 mb-2">

                RUT

              </label>

              <input

                type="text"

                id="customer_rut"

                name="customer_rut"

                value={formData.customer_rut}

                onChange={handleChange}

                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

                placeholder="12.345.678-9"

              />

            </div>

            <div>

              <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-2">

              Telfono

              </label>

              <input

                type="text"

                id="customer_phone"

                name="customer_phone"

                value={formData.customer_phone}

                onChange={handleChange}

                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

                placeholder="+56 9 1234 5678"

              />

            </div>

            <div>

              <label

                htmlFor="customer_address"

                className="block text-sm font-medium text-gray-700 mb-2"

              >

                Direccin

              </label>

              <input

                type="text"

                id="customer_address"

                name="customer_address"

                value={formData.customer_address}

                onChange={handleChange}

                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

                placeholder="Calle 123"

              />

            </div>

            <div>

              <label htmlFor="customer_city" className="block text-sm font-medium text-gray-700 mb-2">

                Ciudad

              </label>

              <input

                type="text"

                id="customer_city"

                name="customer_city"

                value={formData.customer_city}

                onChange={handleChange}

                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"

                placeholder="Ciudad"

              />

            </div>

          </div>

        </div>



        <div>

          <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-2">

            Observaciones iniciales

          </label>

          <textarea

            id="observaciones"

            name="observaciones"

            value={formData.observaciones}

            onChange={handleChange}

            rows={4}

            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"

            placeholder="Detalles adicionales, reparaciones necesarias, etc."

          />

        </div>



        <div className="flex gap-4 pt-4">

          <button

            type="submit"

            disabled={isSubmitting}

            className="flex-1 btn-primary px-6 py-3 rounded-lg font-medium focus:ring-4 focus:ring-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

          >

            <Save className="w-5 h-5" />

            {isSubmitting ? 'Guardando...' : editingVehicle ? 'Actualizar vehculo' : 'Registrar vehculo'}

          </button>



          <button

            type="button"

            onClick={handleClear}

            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"

          >

            <RotateCcw className="w-5 h-5" />

            {editingVehicle ? 'Cancelar' : 'Limpiar'}

          </button>

        </div>

      </form>

    </div>

  );

}



