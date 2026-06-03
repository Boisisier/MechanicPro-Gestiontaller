import { useEffect, useState } from 'react';
import { History, RotateCcw, Save, Search, Send, X } from 'lucide-react';

type PreviousVehicleData = Partial<VehicleFormData> & {
  id?: string;
  patente: string;
  fecha_ingreso?: string;
  created_at?: string;
};

type LookupMode = 'patente' | 'rut';

interface VehicleFormProps {
  onSubmit: (data: VehicleFormData) => Promise<void>;
  editingVehicle?: VehicleFormData & { id: string } | null;
  onCancelEdit?: () => void;
  existingVehicles?: PreviousVehicleData[];
}

export interface VehicleFormData {
  patente: string;
  marca: string;
  modelo: string;
  ano: number;
  tipo_vehiculo: string;
  codigo_vin: string;
  codigo_motor: string;
  color: string;
  kilometraje: number;
  cantidad_combustible: number;
  estado: 'En taller' | 'Entregado' | 'En revision';
  customer_name: string;
  customer_rut: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  observaciones: string;
  comentario_tecnico: string;
  fallas_detectadas: string[];
}

const initialFormData: VehicleFormData = {
  patente: '',
  marca: '',
  modelo: '',
  ano: new Date().getFullYear(),
  tipo_vehiculo: 'Auto',
  codigo_vin: '',
  codigo_motor: '',
  color: '',
  kilometraje: 0,
  cantidad_combustible: 0,
  estado: 'En taller',
  customer_name: '',
  customer_rut: '',
  customer_phone: '',
  customer_address: '',
  customer_city: '',
  observaciones: '',
  comentario_tecnico: '',
  fallas_detectadas: [],
};

const failureChecklist = [
  {
    category: 'Motor',
    groups: [
      { label: 'Niveles', items: ['Aceite', 'Refrigerante'] },
      { label: 'Fugas', items: ['Aceite', 'Refrigerante'] },
      { label: 'Componentes', items: ['Bujías', 'Filtro de aceite', 'Mangueras', 'Correas de mando'] },
      { label: 'Línea de escape', items: ['Estado', 'Fugas'] },
    ],
  },
  {
    category: 'Transmisión',
    groups: [
      { label: 'Aceite', items: ['Nivel de aceite', 'Fuga de aceite'] },
      { label: 'Estado embrague', items: ['Dureza', 'Desgaste'] },
    ],
  },
  {
    category: 'Dirección',
    groups: [
      { label: 'Sistema', items: ['Nivel de líquido', 'Terminales'] },
    ],
  },
  {
    category: 'Frenos',
    groups: [
      { label: 'Desgaste', items: ['Pastillas', 'Balatas'] },
      { label: 'Fuga de líquido', items: ['Nivel de líquido'] },
      { label: 'Regulación', items: ['Freno de mano'] },
    ],
  },
  {
    category: 'Ejes',
    groups: [
      { label: 'Estado', items: ['Fuelles', 'Soporte'] },
    ],
  },
  {
    category: 'Suspensión y amortiguación',
    groups: [
      { label: 'Suspensión', items: ['Estado de rótulas de suspensión', 'Bujes de bandeja'] },
      { label: 'Amortiguadores', items: ['Dureza', 'Humedad'] },
      { label: 'Neumáticos', items: ['Estado', 'Presión'] },
    ],
  },
  {
    category: 'Electricidad',
    groups: [
      { label: 'Bateria', items: ['Estado', 'Nivel', 'Densidad'] },
      { label: 'Luces', items: ['Interior', 'Exterior'] },
      { label: 'Sistema', items: ['Bocina', 'Aire acondicionado'] },
    ],
  },
  {
    category: 'Carroceria',
    groups: [
      { label: 'Estado exterior', items: ['Puertas', 'Pintura y superficie'] },
      { label: 'Limpia parabrisas', items: ['Estado de plumillas'] },
    ],
  },
];

const formatPatente = (value: string) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (normalized.length <= 2) {
    return normalized;
  }
  if (/^[A-Z]{2}\d/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }
  if (normalized.length <= 4) {
    return normalized;
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

const isCompletePatente = (value: string) => /^(?:[A-Z]{2}-\d{4}|[A-Z]{4}-\d{2})$/.test(value);

const normalizeRut = (value: string) => value.toUpperCase().replace(/[^0-9K]/g, '');

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const buildFormDataFromPreviousVisit = (vehicle: PreviousVehicleData, patente: string): VehicleFormData => ({
  patente,
  marca: vehicle.marca || '',
  modelo: vehicle.modelo || '',
  ano: vehicle.ano || new Date().getFullYear(),
  tipo_vehiculo: vehicle.tipo_vehiculo || 'Auto',
  codigo_vin: vehicle.codigo_vin || '',
  codigo_motor: vehicle.codigo_motor || '',
  color: '',
  kilometraje: 0,
  cantidad_combustible: 0,
  estado: 'En taller',
  customer_name: vehicle.customer_name || '',
  customer_rut: vehicle.customer_rut || '',
  customer_phone: vehicle.customer_phone || '',
  customer_address: vehicle.customer_address || '',
  customer_city: vehicle.customer_city || '',
  observaciones: '',
  comentario_tecnico: '',
  fallas_detectadas: [],
});

export default function VehicleForm({
  onSubmit,
  editingVehicle,
  onCancelEdit,
  existingVehicles = [],
}: VehicleFormProps) {
  const [formData, setFormData] = useState<VehicleFormData>(editingVehicle || initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedPatente, setLoadedPatente] = useState('');
  const [lookupMode, setLookupMode] = useState<LookupMode | null>(null);
  const [lookupTerm, setLookupTerm] = useState('');

  useEffect(() => {
    if (editingVehicle) {
      const { id, ...data } = editingVehicle;
      setFormData(data);
    } else {
      setFormData(initialFormData);
    }
    setLoadedPatente('');
    setLookupMode(null);
    setLookupTerm('');
  }, [editingVehicle]);

  const lookupMatches = existingVehicles
    .filter((vehicle) => {
      if (lookupMode === 'patente') {
        return vehicle.patente === lookupTerm;
      }
      if (lookupMode === 'rut') {
        return normalizeRut(vehicle.customer_rut || '') === lookupTerm;
      }
      return false;
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha_ingreso || a.created_at || 0).getTime();
      const dateB = new Date(b.fecha_ingreso || b.created_at || 0).getTime();
      return dateB - dateA;
    });

  const associatedPatentes = Array.from(new Set(lookupMatches.map((vehicle) => vehicle.patente)));

  const openPatenteLookup = (patente = formData.patente) => {
    if (editingVehicle || !isCompletePatente(patente)) {
      return;
    }
    setLookupMode('patente');
    setLookupTerm(patente);
  };

  const openRutLookup = (rut = formData.customer_rut) => {
    if (editingVehicle) {
      return;
    }
    const normalizedRut = normalizeRut(rut);
    if (normalizedRut.length < 7) {
      return;
    }
    setLookupMode('rut');
    setLookupTerm(normalizedRut);
  };

  const closeLookup = () => {
    setLookupMode(null);
    setLookupTerm('');
  };

  const loadPreviousVisit = (vehicle: PreviousVehicleData) => {
    setFormData(buildFormDataFromPreviousVisit(vehicle, vehicle.patente));
    setLoadedPatente(vehicle.patente);
    closeLookup();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'patente') {
      const patente = formatPatente(value);

      setFormData((prev) => ({
        ...prev,
        patente,
      }));
      setLoadedPatente('');
      if (isCompletePatente(patente)) {
        openPatenteLookup(patente);
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: ['ano', 'kilometraje', 'cantidad_combustible'].includes(name)
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleFailureToggle = (failure: string) => {
    setFormData((prev) => {
      const exists = prev.fallas_detectadas.includes(failure);
      return {
        ...prev,
        fallas_detectadas: exists
          ? prev.fallas_detectadas.filter((item) => item !== failure)
          : [...prev.fallas_detectadas, failure],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendToReview();
  };

  const handleSendToReview = async () => {
    const form = document.getElementById('vehicle-entry-form') as HTMLFormElement | null;
    if (form && !form.reportValidity()) {
      return;
    }

    const shouldSend = window.confirm('¿Quieres enviar el vehículo a revisión?');
    if (!shouldSend) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData, estado: 'En revision' });
      if (!editingVehicle) {
        setFormData(initialFormData);
        setLoadedPatente('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData(initialFormData);
    setLoadedPatente('');
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  useEffect(() => {
    const handleExternalClear = () => {
      setFormData(initialFormData);
      setLoadedPatente('');
      if (onCancelEdit) {
        onCancelEdit();
      }
    };

    window.addEventListener('vehicle-form-clear', handleExternalClear);
    return () => window.removeEventListener('vehicle-form-clear', handleExternalClear);
  }, [onCancelEdit]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {editingVehicle ? 'Editar vehículo' : 'Registro de vehículo'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Complete los datos del vehículo</p>
      </div>

      <div className="hidden">
        <button
          type="button"
          onClick={handleClear}
          className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700 focus:ring-4 focus:ring-red-200"
        >
          <RotateCcw className="w-4 h-4" />
          {editingVehicle ? 'Cancelar edición' : 'Limpiar formulario'}
        </button>
        <button
          type="button"
          form="vehicle-entry-form"
          disabled={isSubmitting}
          className="hidden"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Guardando...' : editingVehicle ? 'Actualizar vehículo' : 'Registrar vehículo'}
        </button>
        <button
          type="button"
          onClick={handleSendToReview}
          disabled={isSubmitting}
          className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Ingresar Vehículo
        </button>
      </div>

      <form id="vehicle-entry-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="border-t border-gray-200 pt-6">
          <h4 className="mb-4 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">Datos del Vehículo</h4>
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
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
              placeholder="AB-1234 o ABCD-12"
            />
            <button
              type="button"
              onClick={() => openPatenteLookup()}
              disabled={!isCompletePatente(formData.patente)}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              Ver atenciones
            </button>
            {loadedPatente === formData.patente && (
              <p className="mt-2 text-sm font-medium text-emerald-700">
                Datos cargados desde el último ingreso de esta patente.
              </p>
            )}
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
            <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-2">
              Año *
            </label>
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
            <label htmlFor="codigo_vin" className="block text-sm font-medium text-gray-700 mb-2">
              Código VIN
            </label>
            <input
              type="text"
              id="codigo_vin"
              name="codigo_vin"
              value={formData.codigo_vin}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
              placeholder="VIN del vehículo"
            />
          </div>

          <div>
            <label htmlFor="codigo_motor" className="block text-sm font-medium text-gray-700 mb-2">
              Código de motor
            </label>
            <input
              type="text"
              id="codigo_motor"
              name="codigo_motor"
              value={formData.codigo_motor}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
              placeholder="Código de motor"
            />
          </div>

          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="mb-4 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">Datos del ingreso actual</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Color observado al ingreso"
            />
          </div>

          <div>
            <label htmlFor="kilometraje" className="block text-sm font-medium text-gray-700 mb-2">
              Kilometraje
            </label>
            <input
              type="text"
              inputMode="numeric"
              id="kilometraje"
              name="kilometraje"
              value={formData.kilometraje || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Kilometraje actual"
            />
          </div>

          <div>
            <label htmlFor="cantidad_combustible" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de combustible (%)
            </label>
            <input
              type="text"
              inputMode="numeric"
              id="cantidad_combustible"
              name="cantidad_combustible"
              value={formData.cantidad_combustible || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Porcentaje actual"
            />
          </div>
        </div>

          <div className="mt-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h5 className="inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">Posibles fallas al ingreso</h5>
              <span className="text-xs text-gray-500">
                {formData.fallas_detectadas.length} seleccionada(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {failureChecklist.map((section) => (
                <div key={section.category} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900">{section.category}</p>
                  <div className="mt-3 space-y-3">
                    {section.groups.map((group) => (
                      <div key={`${section.category}-${group.label}`}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {group.items.map((item) => {
                            const value = `${section.category} > ${group.label} > ${item}`;
                            return (
                              <label
                                key={value}
                                className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.fallas_detectadas.includes(value)}
                                  onChange={() => handleFailureToggle(value)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{item}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label htmlFor="observaciones" className="mb-2 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                Observaciones iniciales (Cliente)
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

            <div>
              <label htmlFor="comentario_tecnico" className="mb-2 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                Comentario técnico
              </label>
              <textarea
                id="comentario_tecnico"
                name="comentario_tecnico"
                value={formData.comentario_tecnico}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Comentario interno de recepción o mecánico"
              />
            </div>
          </div>

        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="mb-4 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">Datos del cliente</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <label htmlFor="customer_rut" className="block text-sm font-medium text-gray-700 mb-2">
                RUT *
              </label>
              <input
                type="text"
                id="customer_rut"
                name="customer_rut"
                value={formData.customer_rut}
                onChange={handleChange}
                onBlur={() => openRutLookup()}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="12.345.678-9"
              />
              <button
                type="button"
                onClick={() => openRutLookup()}
                disabled={normalizeRut(formData.customer_rut).length < 7}
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                Ver Vehículos
              </button>
            </div>

            <div>
              <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="text"
                id="customer_phone"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700 mb-2">
                Dirección *
              </label>
              <input
                type="text"
                id="customer_address"
                name="customer_address"
                value={formData.customer_address}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Calle 123"
              />
            </div>

            <div>
              <label htmlFor="customer_city" className="block text-sm font-medium text-gray-700 mb-2">
                Correo *
              </label>
              <input
                type="email"
                id="customer_city"
                name="customer_city"
                value={formData.customer_city}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="cliente@correo.com"
              />
            </div>
          </div>
        </div>

      </form>

      {lookupMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <History className="h-5 w-5" />
                  {lookupMode === 'patente' ? 'Atenciones de la patente' : 'Vehículos asociados al RUT'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {lookupMode === 'patente'
                    ? `Patente ${lookupTerm}: ${lookupMatches.length} atención(es).`
                    : `RUT ${formData.customer_rut}: ${associatedPatentes.length} vehículo(s), ${lookupMatches.length} atención(es).`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLookup}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar historial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {lookupMatches.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  No se encontraron registros previos.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Patente</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Vehículo</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ingreso</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {lookupMatches.map((vehicle, index) => (
                        <tr key={vehicle.id || `${vehicle.patente}-${index}`}>
                          <td className="px-4 py-3 font-semibold uppercase text-gray-900">{vehicle.patente}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {[vehicle.marca, vehicle.modelo, vehicle.ano].filter(Boolean).join(' ') || '-'}
                            <div className="text-xs text-gray-500">{vehicle.tipo_vehiculo || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {vehicle.customer_name || '-'}
                            <div className="text-xs text-gray-500">{vehicle.customer_rut || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{vehicle.estado || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{formatDate(vehicle.fecha_ingreso)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => loadPreviousVisit(vehicle)}
                              className="rounded-lg btn-primary px-3 py-2 text-xs font-semibold"
                            >
                              Cargar datos
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
