import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, RotateCcw, Save, Search, Send, X } from 'lucide-react';
import { getModelsForBrand, vehicleBrandNames } from '../../../features/vehiculo/vehicleModelCatalog';
import type { CatalogService } from '../../lib/types';
import { CUSTOMER_NAME_MAX_LENGTH } from '../../lib/validation';
import ConfirmDialog from '../ui/ConfirmDialog';

type PreviousVehicleData = Omit<Partial<VehicleFormData>, 'promised_delivery_date'> & {
  id?: string;
  patente: string;
  promised_delivery_date?: string | null;
  fecha_ingreso?: string;
  created_at?: string;
};

type LookupMode = 'patente' | 'rut';

const formSteps = [
  'Datos de Vehículo y Datos de Ingreso Actual',
  'Datos de Cliente',
  'Observaciones Iniciales y Comentario Técnico',
  'Planificación de la atención',
];

const requiredFieldsByStep = [
  ['patente', 'marca', 'modelo', 'ano'],
  ['customer_name', 'customer_rut', 'customer_phone', 'customer_address', 'customer_city', 'customer_email'],
  [],
  ['attention_priority', 'estimated_work_hours', 'promised_delivery_date', 'customer_authorized'],
];

interface VehicleFormProps {
  onSubmit: (data: VehicleFormData) => Promise<void>;
  editingVehicle?: VehicleFormData & { id: string } | null;
  onCancelEdit?: () => void;
  existingVehicles?: PreviousVehicleData[];
  mechanics?: Array<{ id: string; name: string }>;
  canManageAdvance?: boolean;
  serviceCatalog?: CatalogService[];
  initialData?: Partial<VehicleFormData> | null;
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
  estado: 'Ingresado' | 'Entregado' | 'En Taller';
  customer_name: string;
  customer_rut: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_email: string;
  assigned_mechanic_id: string;
  assigned_mechanic_name: string;
  customer_advance: number;
  attention_priority: 'Baja' | 'Normal' | 'Alta' | 'Urgente';
  estimated_work_hours: number;
  promised_delivery_date: string;
  customer_authorized: boolean;
  servicios: string[];
  observaciones: string;
  comentario_tecnico: string;
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
  estado: 'Ingresado',
  customer_name: '',
  customer_rut: '',
  customer_phone: '',
  customer_address: '',
  customer_city: '',
  customer_email: '',
  assigned_mechanic_id: '',
  assigned_mechanic_name: '',
  customer_advance: 0,
  attention_priority: 'Normal',
  estimated_work_hours: 0,
  promised_delivery_date: '',
  customer_authorized: false,
  servicios: [],
  observaciones: '',
  comentario_tecnico: '',
};

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

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

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
  estado: 'Ingresado',
  customer_name: vehicle.customer_name || '',
  customer_rut: vehicle.customer_rut || '',
  customer_phone: vehicle.customer_phone || '',
  customer_address: vehicle.customer_address || '',
  customer_city: vehicle.customer_city || '',
  customer_email: vehicle.customer_email || '',
  assigned_mechanic_id: '',
  assigned_mechanic_name: '',
  customer_advance: 0,
  attention_priority: 'Normal',
  estimated_work_hours: 0,
  promised_delivery_date: '',
  customer_authorized: false,
  servicios: [],
  observaciones: '',
  comentario_tecnico: '',
});

export default function VehicleForm({
  onSubmit,
  editingVehicle,
  onCancelEdit,
  existingVehicles = [],
  mechanics = [],
  canManageAdvance = false,
  serviceCatalog = [],
  initialData = null,
}: VehicleFormProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    ...initialFormData,
    ...(initialData || {}),
    ...(editingVehicle || {}),
    servicios: editingVehicle?.servicios || [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedPatente, setLoadedPatente] = useState('');
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<LookupMode | null>(null);
  const [lookupTerm, setLookupTerm] = useState('');
  const [brandFocused, setBrandFocused] = useState(false);
  const [modelFocused, setModelFocused] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCatalogOpen, setServiceCatalogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const availableModels = getModelsForBrand(formData.marca);
  const brandSuggestions = vehicleBrandNames
    .filter((brand) => normalizeSearch(brand).includes(normalizeSearch(formData.marca)))
    .slice(0, 8);
  const modelSuggestions = availableModels
    .filter((model) => normalizeSearch(model).includes(normalizeSearch(formData.modelo)))
    .slice(0, 8);
  const normalizedServiceSearch = normalizeSearch(serviceSearch);
  const filteredServiceCatalog = Array.from(
    serviceCatalog.reduce<Map<string, CatalogService[]>>((groups, service) => {
      const current = groups.get(service.category) || [];
      groups.set(service.category, [...current, service]);
      return groups;
    }, new Map()),
  )
    .map(([category, services]) => ({
      category,
      services: services.filter((service) =>
        normalizeSearch(`${category} ${service.name}`).includes(
          normalizedServiceSearch,
        ),
      ),
    }))
    .filter((category) => category.services.length > 0);

  useEffect(() => {
    if (editingVehicle) {
      const data = editingVehicle;
      setFormData({
        ...initialFormData,
        ...data,
        servicios: data.servicios || [],
      });
    } else {
      setFormData({ ...initialFormData, ...(initialData || {}) });
    }
    setLoadedPatente('');
    setLookupMode(null);
    setLookupTerm('');
    setCurrentStep(0);
    setServiceSearch('');
    setServiceCatalogOpen(false);
  }, [editingVehicle, initialData]);

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

    if (name === 'marca') {
      const brandModels = getModelsForBrand(value);
      setFormData((prev) => ({
        ...prev,
        marca: value,
        modelo: brandModels.length > 0 && !brandModels.includes(prev.modelo) ? '' : prev.modelo,
      }));
      return;
    }

    if (name === 'assigned_mechanic_id') {
      const mechanic = mechanics.find((item) => item.id === value);
      setFormData((prev) => ({
        ...prev,
        assigned_mechanic_id: value,
        assigned_mechanic_name: mechanic?.name || '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: ['ano', 'kilometraje', 'cantidad_combustible', 'customer_advance'].includes(name)
        ? parseInt(value) || 0
        : name === 'estimated_work_hours'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(service)
        ? prev.servicios.filter((item) => item !== service)
        : [...prev.servicios, service],
    }));
  };

  const getInvalidFieldForStep = (step: number) =>
    requiredFieldsByStep[step]
      .map((id) => document.getElementById(id) as HTMLInputElement | null)
      .find((field) => field && !field.checkValidity()) || null;

  const validateStep = (step: number) => {
    const invalidField = getInvalidFieldForStep(step);
    if (!invalidField) {
      return true;
    }
    invalidField.reportValidity();
    invalidField.focus();
    return false;
  };

  const handleNextStep = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((step) => Math.min(formSteps.length - 1, step + 1));
  };

  const handlePreviousStep = () => {
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const focusInvalidStep = () => {
    const invalidStep = requiredFieldsByStep.findIndex((_, step) =>
      Boolean(getInvalidFieldForStep(step)),
    );
    if (invalidStep < 0) {
      return false;
    }
    setCurrentStep(invalidStep);
    window.setTimeout(() => {
      const invalidField = getInvalidFieldForStep(invalidStep);
      invalidField?.reportValidity();
      invalidField?.focus();
    }, 0);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendToReview();
  };

  const handleSendToReview = async () => {
    if (focusInvalidStep()) {
      return;
    }
    setSendConfirmOpen(true);
    return;
  };

  const handleClear = () => {
    setFormData(initialFormData);
    setLoadedPatente('');
    setCurrentStep(0);
    setServiceSearch('');
    setServiceCatalogOpen(false);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const performSendToReview = async () => {
    const form = document.getElementById('vehicle-entry-form') as HTMLFormElement | null;
    if (form && !form.reportValidity()) {
      setSendConfirmOpen(false);
      return;
    }

    setSendConfirmOpen(false);
    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData, estado: 'En Taller' });
      if (!editingVehicle) {
        setFormData(initialFormData);
        setLoadedPatente('');
        setCurrentStep(0);
        setServiceSearch('');
        setServiceCatalogOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleExternalClear = () => {
      setFormData(initialFormData);
      setLoadedPatente('');
      setCurrentStep(0);
      setServiceSearch('');
      setServiceCatalogOpen(false);
      if (onCancelEdit) {
        onCancelEdit();
      }
    };

    window.addEventListener('vehicle-form-clear', handleExternalClear);
    return () => window.removeEventListener('vehicle-form-clear', handleExternalClear);
  }, [onCancelEdit]);

  return (
    <div className="vehicle-entry-form bg-white rounded-xl border border-gray-200 p-4 shadow-sm sm:p-6">
      <ConfirmDialog
        open={sendConfirmOpen}
        title="Enviar a En Taller"
        message="El vehículo ingresar? al submódulo En Taller para que el mecánico pueda registrar trabajos, repuestos y observaciones."
        confirmLabel="Enviar a En Taller"
        variant="info"
        onConfirm={performSendToReview}
        onCancel={() => setSendConfirmOpen(false)}
      />
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {editingVehicle ? 'Editar vehículo' : 'Registro de vehículo'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Complete los datos del vehículo</p>
      </div>

      <div className="mb-5 px-3 sm:px-6">
        <div className="relative mx-5">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[#0f4471] transition-[width] duration-500 ease-out"
              style={{
                width: `${(currentStep / (formSteps.length - 1)) * 100}%`,
              }}
            />
          </div>

          <div className="relative z-10 flex items-center justify-between">
          {formSteps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;

            return (
              <button
                key={step}
                type="button"
                onClick={() => index <= currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                title={step}
                aria-label={`Paso ${index + 1}: ${step}`}
                aria-current={isActive ? 'step' : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'border-[#0f4471] bg-[#0f4471] text-white shadow-sm ring-4 ring-[#0f4471]/15'
                    : isCompleted
                      ? 'border-[#0f4471] bg-white text-[#0f4471]'
                      : 'border-gray-300 bg-white text-gray-400'
                } disabled:cursor-not-allowed`}
              >
                {index + 1}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <div className="hidden">
        <button
          type="button"
          onClick={handleClear}
          className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#df2f2f] focus:ring-4 focus:ring-[#fc3d3c]/20"
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
          className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Ingresar Vehículo
        </button>
      </div>

      <form id="vehicle-entry-form" onSubmit={handleSubmit} className="space-y-6">
        <div className={currentStep === 0 ? "rounded-xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm" : "hidden"}>
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

          <div className="relative">
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-2">
              Marca *
            </label>
            <input
              type="text"
              id="marca"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              onFocus={() => setBrandFocused(true)}
              onBlur={() => setTimeout(() => setBrandFocused(false), 120)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Escribe o selecciona una marca"
            />
            {brandFocused && formData.marca && brandSuggestions.length > 0 && (
              <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {brandSuggestions.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const brandModels = getModelsForBrand(brand);
                      setFormData((prev) => ({
                        ...prev,
                        marca: brand,
                        modelo: brandModels.includes(prev.modelo) ? prev.modelo : '',
                      }));
                      setBrandFocused(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-2">
              Modelo *
            </label>
            <input
              type="text"
              id="modelo"
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              onFocus={() => setModelFocused(true)}
              onBlur={() => setTimeout(() => setModelFocused(false), 120)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={availableModels.length > 0 ? 'Escribe o selecciona un modelo' : 'Escribe el modelo'}
            />
            {modelFocused && availableModels.length > 0 && modelSuggestions.length > 0 && (
              <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {modelSuggestions.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, modelo: model }));
                      setModelFocused(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
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

        <div className={[0, 2].includes(currentStep) ? "rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm" : "hidden"}>
          <div className={currentStep === 0 ? "" : "hidden"}>
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
          </div>

          

          <div className={currentStep === 2 ? "mb-4" : "hidden"}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Servicios y reparaciones solicitadas
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.servicios.length} servicio(s) seleccionado(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setServiceCatalogOpen((open) => !open)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b365c]"
              >
                <Search className="h-4 w-4" />
                Buscar servicios
              </button>
            </div>

            {formData.servicios.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.servicios.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => handleServiceToggle(service)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#0f4471]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#0f4471] hover:border-[#fc3d3c]/30 hover:bg-[#fc3d3c]/10 hover:text-[#b42318]"
                    title="Quitar servicio"
                  >
                    {service}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}

            {serviceCatalogOpen && (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={serviceSearch}
                      onChange={(event) => setServiceSearch(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#0f4471] focus:outline-none"
                      placeholder="Buscar servicio o sistema"
                    />
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto p-3">
                  {filteredServiceCatalog.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No se encontraron servicios.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {filteredServiceCatalog.map((category) => (
                        <div key={category.category}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {category.category}
                          </p>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {category.services.map((service) => {
                              const selected = formData.servicios.includes(service.name);
                              return (
                                <button
                                  key={service.id || service.name}
                                  type="button"
                                  onClick={() => handleServiceToggle(service.name)}
                                  className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                    selected
                                      ? 'border-[#0f4471] bg-[#0f4471]/5 font-semibold text-[#0f4471]'
                                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <span>
                                    {service.name}
                                    <small className="ml-2 text-gray-500">
                                      {service.estimated_hours || 0} h
                                    </small>
                                  </span>
                                  <span className="text-xs font-bold">
                                    {selected ? 'Seleccionado' : '+'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={currentStep === 2 ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "hidden"}>
            <div>
              <label htmlFor="observaciones" className="mb-2 inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
                Observaciones iniciales (Cliente)
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
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
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Comentario interno de recepción o mecánico"
              />
            </div>
          </div>

        </div>

        <div className={currentStep === 1 ? "rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm" : "hidden"}>
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
                maxLength={CUSTOMER_NAME_MAX_LENGTH}
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
                Ciudad *
              </label>
              <input
                type="text"
                id="customer_city"
                name="customer_city"
                value={formData.customer_city}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ciudad"
              />
            </div>

            <div>
              <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo
              </label>
              <input
                type="email"
                id="customer_email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="cliente@correo.com"
              />
            </div>
          </div>
        </div>

        <div className={currentStep === 3 ? "rounded-xl border border-blue-100 bg-blue-50/30 p-5 shadow-sm" : "hidden"}>
          <h4 className="mb-4 inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm">Planificación de la atención</h4>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="assigned_mechanic_id" className="block text-sm font-medium text-gray-700 mb-2">
                Mecánico asignado
              </label>
              <select
                id="assigned_mechanic_id"
                name="assigned_mechanic_id"
                value={formData.assigned_mechanic_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Sin asignar</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="attention_priority" className="block text-sm font-medium text-gray-700 mb-2">Prioridad *</label>
              <select id="attention_priority" name="attention_priority" value={formData.attention_priority} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option value="Baja">Baja</option>
                <option value="Normal">Normal</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label htmlFor="estimated_work_hours" className="block text-sm font-medium text-gray-700 mb-2">Horas estimadas *</label>
              <input type="number" id="estimated_work_hours" name="estimated_work_hours" value={formData.estimated_work_hours || ''} onChange={handleChange} min="0.5" step="0.5" required className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Ej. 4,5" />
            </div>
            <div>
              <label htmlFor="promised_delivery_date" className="block text-sm font-medium text-gray-700 mb-2">Fecha comprometida *</label>
              <input type="date" id="promised_delivery_date" name="promised_delivery_date" value={formData.promised_delivery_date} onChange={handleChange} min={new Date().toLocaleDateString('en-CA')} required className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            {canManageAdvance && (
              <div className="md:col-span-2">
                <label htmlFor="customer_advance" className="block text-sm font-medium text-gray-700 mb-2">
                  Abono del cliente
                </label>
                <input
                  type="number"
                  id="customer_advance"
                  name="customer_advance"
                  value={formData.customer_advance || ''}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Monto abonado"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se descontar? del total final de la atención.
                </p>
              </div>
            )}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 md:col-span-2">
              <input
                type="checkbox"
                id="customer_authorized"
                checked={formData.customer_authorized}
                onChange={(event) => setFormData((previous) => ({ ...previous, customer_authorized: event.target.checked }))}
                required
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0f4471] focus:ring-[#0f4471]"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">Autorización del cliente *</span>
                <span className="mt-0.5 block text-xs text-gray-500">El cliente autorizó el diagnóstico y los servicios seleccionados para iniciar la atención.</span>
              </span>
            </label>
          </div>

          <div className="mt-5 border-t border-blue-100 pt-4">
            <h5 className="text-sm font-semibold text-gray-900">Resumen antes de enviar a En Taller</h5>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              <div><dt className="text-gray-500">Vehículo</dt><dd className="mt-0.5 font-medium text-gray-900">{formData.patente || 'Sin patente'}</dd></div>
              <div><dt className="text-gray-500">Servicios</dt><dd className="mt-0.5 font-medium text-gray-900">{formData.servicios.length} seleccionado(s)</dd></div>
              <div><dt className="text-gray-500">Responsable</dt><dd className="mt-0.5 font-medium text-gray-900">{formData.assigned_mechanic_name || 'Sin asignar'}</dd></div>
              <div><dt className="text-gray-500">Planificación</dt><dd className="mt-0.5 font-medium text-gray-900">{formData.estimated_work_hours || 0} h · {formData.attention_priority}</dd></div>
              {canManageAdvance && <div><dt className="text-gray-500">Abono</dt><dd className="mt-0.5 font-medium text-gray-900">${formData.customer_advance.toLocaleString('es-CL')}</dd></div>}
            </dl>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={currentStep === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {currentStep < formSteps.length - 1 ? (
            <button
              key="next-step"
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f4471] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b365c]"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              key="submit-vehicle"
              type="button"
              onClick={handleSendToReview}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Guardando...' : 'Ingresar Vehículo'}
            </button>
          )}
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
