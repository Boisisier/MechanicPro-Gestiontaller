import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import {
  clearAuthToken,
  createVehicle,
  getAuthToken,
  getSession,
  getVehicles,
  loginDemo,
  setAuthToken,
  updateVehicle,
} from './lib/api';

import type { Vehicle } from './lib/types';

import Sidebar from './components/Sidebar';

import Header from './components/Header';

import MetricsCards from './components/MetricsCards';

import VehicleForm, { VehicleFormData } from './components/VehicleForm';

import VehicleTable from './components/VehicleTable';

import VehicleHistoryTable from './components/VehicleHistoryTable';

import { CheckCircle, AlertCircle, Search, Trash2, X, Plus, Calculator, RotateCcw, Send } from 'lucide-react';




interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface ReviewServiceItem {
  name: string;
  price: string;
}

interface ReviewPartItem {
  inventoryItemId: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
  location: string;
}

interface BudgetServiceItem {
  id: string;
  name: string;
  price: number;
}

interface CatalogService {
  category: string;
  name: string;
}

type UserRole = 'Administrador de Taller' | 'Administrativo' | 'Mecánico';

interface WorkshopUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const roleModules: Record<UserRole, string[]> = {
  'Administrador de Taller': ['Dashboard', 'Vehículos', 'Presupuesto', 'Inventario', 'Reportes', 'Configuración'],
  Administrativo: ['Dashboard', 'Vehículos', 'Presupuesto', 'Reportes'],
  Mecánico: ['Dashboard', 'Vehículos', 'Reportes'],
};

const defaultWorkshopUsers: WorkshopUser[] = [
  {
    id: 'admin-taller',
    name: 'Administrador de Taller',
    email: 'admin@taller.cl',
    role: 'Administrador de Taller',
  },
  {
    id: 'administrativo',
    name: 'Administrativo',
    email: 'administrativo@taller.cl',
    role: 'Administrativo',
  },
  {
    id: 'mecanico',
    name: 'Mecánico',
    email: 'mecanico@taller.cl',
    role: 'Mecánico',
  },
];

const toSoftAccent = (hexColor: string) => {
  const cleaned = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return '#e7efff';
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.88);
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
};

const legacyServiceCatalog = [
  'Cambio de aceite y filtros',
  'Diagnóstico general',
  'Frenos',
  'Suspensión',
  'Alineación y balanceo',
  'Sistema eléctrico',
  'Refrigeración',
  'Transmisión',
  'Embrague',
  'Neumáticos',
  'Escape',
  'Aire acondicionado',
];

legacyServiceCatalog.push(
  'Cambio de aceite de caja',
  'Cambio de filtro de aire',
  'Cambio de filtro de combustible',
  'Escaneo computarizado',
  'Revisión precompra',
  'Rectificado de discos',
  'Cambio de pastillas',
  'Dirección',
  'Baterí­a y carga',
  'Motor de arranque',
  'Alternador',
  'Radiador',
  'Inyección',
  'Afinamiento',
  'Distribución',
  'Correa de accesorios',
  'Catalizador',
  'Calefacción',
  'Limpieza de inyectores',
  'Cambio de bují­as',
  'Tren delantero',
  'Rodamientos',
  'ABS y control de estabilidad',
  'Revisión de luces'
);

const serviceCatalogByCategory = [
  {
    category: 'Diagnostico e inspección',
    services: [
      'Diagnostico general',
      'Escaneo computarizado',
      'Lectura y borrado de codigos de falla',
      'Diagnostico eléctrico',
      'Diagnostico de motor',
      'Diagnostico de transmision',
      'Diagnostico de frenos ABS',
      'Diagnostico de suspension',
      'Diagnostico de climatizacion',
      'Revision precompra',
      'Revision tecnica preventiva',
      'Inspeccion de fugas',
      'Prueba de ruta',
    ],
  },
  {
    category: 'Mantenimiento preventivo',
    services: [
      'Mantencion por kilometraje',
      'Cambio de aceite de motor',
      'Cambio de filtro de aceite',
      'Cambio de filtro de aire',
      'Cambio de filtro de combustible',
      'Cambio de filtro de cabina',
      'Revision y relleno de fluidos',
      'Cambio de líquido refrigerante',
      'Cambio de líquido de frenos',
      'Cambio de líquido dirección hidráulica',
      'Cambio de bujias',
      'Cambio de correas auxiliares',
      'Cambio de correa de distribucion',
      'Cambio de kit de distribucion',
      'Limpieza de cuerpo de aceleracion',
      'Limpieza de inyectores',
      'Afinamiento de motor',
      'Reseteo indicador de mantencion',
    ],
  },
  {
    category: 'Lubricacion y fluidos',
    services: [
      'Cambio de aceite de caja manual',
      'Cambio de aceite de caja automatica',
      'Cambio de aceite CVT',
      'Cambio de aceite DSG',
      'Cambio de aceite diferencial',
      'Cambio de aceite transfer',
      'Cambio de aceite corona',
      'Flush de transmision',
      'Lavado de sistema de refrigeracion',
      'Purgado de frenos',
      'Purgado de embrague hidraulico',
      'Revision de niveles y fugas',
    ],
  },
  {
    category: 'Motor',
    services: [
      'Reparacion de motor',
      'Ajuste de motor',
      'Overhaul de motor',
      'Cambio de empaquetadura de culata',
      'Cambio de retenes de motor',
      'Cambio de bomba de agua',
      'Cambio de termostato',
      'Cambio de radiador',
      'Cambio de mangueras de refrigeracion',
      'Cambio de soporte de motor',
      'Reparacion sistema de inyeccion',
      'Reparacion sistema de encendido',
      'Cambio de bobinas',
      'Cambio de sensores de motor',
      'Revision de compresion',
      'Revision de consumo de aceite',
      'Reparacion de turbo',
      'Limpieza valvula EGR',
    ],
  },
  {
    category: 'Transmisión y embrague',
    services: [
      'Revision de transmision manual',
      'Revision de transmision automatica',
      'Reparacion de caja manual',
      'Reparacion de caja automatica',
      'Reprogramacion de transmision',
      'Cambio de kit de embrague',
      'Cambio de prensa y disco',
      'Cambio de rodamiento de empuje',
      'Cambio de volante bimasa',
      'Cambio de soporte de caja',
      'Revision de cardan',
      'Cambio de homocinetica',
      'Cambio de fuelle homocinetica',
      'Cambio de semieje',
      'Revision de diferencial',
    ],
  },
  {
    category: 'Frenos',
    services: [
      'Revision sistema de frenos',
      'Cambio de pastillas de freno',
      'Cambio de zapatas de freno',
      'Cambio de discos de freno',
      'Rectificado de discos',
      'Cambio de tambores',
      'Rectificado de tambores',
      'Cambio de caliper',
      'Mantencion de caliper',
      'Cambio de cilindro de freno',
      'Cambio de bomba de freno',
      'Cambio de flexible de freno',
      'Regulación de freno de mano',
      'Diagnostico ABS',
      'Reparacion ABS',
    ],
  },
  {
    category: 'Suspensión y dirección',
    services: [
      'Revision de suspension',
      'Cambio de amortiguadores',
      'Cambio de cazoletas',
      'Cambio de espirales',
      'Cambio de bandejas',
      'Cambio de bujes',
      'Cambio de rotulas',
      'Cambio de terminales de direccion',
      'Cambio de bieletas',
      'Cambio de barra estabilizadora',
      'Cambio de rodamientos',
      'Cambio de maza',
      'Alineacion',
      'Balanceo',
      'Rotacion de neumaticos',
      'Reparacion de cremallera mecanica',
      'Reparacion de cremallera hidraulica',
      'Cambio de bomba direccion hidraulica',
    ],
  },
  {
    category: 'Neumaticos y ruedas',
    services: [
      'Montaje de neumaticos',
      'Desmontaje de neumaticos',
      'Reparacion de pinchazo',
      'Revision de presion de neumaticos',
      'Cambio de valvulas',
      'Balanceo de ruedas',
      'Alineacion y balanceo',
      'Revision de desgaste irregular',
      'Calibracion TPMS',
      'Cambio sensor TPMS',
    ],
  },
  {
    category: 'Electrico y electronico',
    services: [
      'Revision sistema electrico',
      'Cambio de bateria',
      'Prueba de bateria',
      'Carga de bateria',
      'Reparacion motor de arranque',
      'Cambio motor de arranque',
      'Reparacion alternador',
      'Cambio alternador',
      'Revision sistema de carga',
      'Revision sistema de luces',
      'Alineacion de luces',
      'Cambio de ampolletas',
      'Reparacion de alzavidrios',
      'Reparacion cierre centralizado',
      'Instalacion de alarma',
      'Instalacion de radio',
      'Instalacion de accesorios electricos',
      'Programacion de modulos',
    ],
  },
  {
    category: 'Climatizacion y calefaccion',
    services: [
      'Mantencion aire acondicionado',
      'Carga de gas aire acondicionado',
      'Deteccion de fugas aire acondicionado',
      'Cambio filtro de cabina',
      'Limpieza de ductos',
      'Cambio de compresor A/C',
      'Cambio de condensador A/C',
      'Cambio de evaporador A/C',
      'Reparacion calefaccion',
      'Cambio radiador calefaccion',
      'Cambio blower o ventilador habitaculo',
    ],
  },
  {
    category: 'Escape y emisiones',
    services: [
      'Revision sistema de escape',
      'Reparacion de escape',
      'Cambio de silenciador',
      'Cambio de catalizador',
      'Cambio sensor de oxigeno',
      'Limpieza filtro DPF',
      'Regeneracion DPF',
      'Revision de emisiones',
      'Reparacion fugas de escape',
    ],
  },
  {
    category: 'Combustible e inyeccion',
    services: [
      'Diagnostico sistema de combustible',
      'Cambio bomba de combustible',
      'Cambio filtro de combustible',
      'Limpieza de inyectores',
      'Cambio de inyectores',
      'Revision de presion de combustible',
      'Limpieza estanque combustible',
      'Reparacion linea de combustible',
    ],
  },
  {
    category: 'Carroceria, pintura y cristales',
    services: [
      'Latoneria',
      'Pintura automotriz',
      'Pulido y abrillantado',
      'Reparacion de parachoques',
      'Cambio de parabrisas',
      'Reparacion de alzavidrios',
      'Cambio de plumillas',
      'Instalacion de laminas de seguridad',
      'Detallado interior',
      'Detallado exterior',
    ],
  },
  {
    category: 'Servicio rapido y flotas',
    services: [
      'Ingreso express',
      'Mantencion de flota',
      'Revision diaria de seguridad',
      'Checklist operacional',
      'Preparación para revisión técnica',
      'Servicio de emergencia',
      'Inspeccion post reparacion',
      'Lavado de motor',
      'Lavado exterior',
    ],
  },
];

const serviceCatalog = Array.from(
  new Set([...serviceCatalogByCategory.flatMap(({ services }) => services), ...legacyServiceCatalog])
);

const reviewPartPrefix = '[REPUESTO]';

const parseStoredReviewServices = (services: string[] = []): ReviewServiceItem[] =>
  services.filter((service) => !service.startsWith(reviewPartPrefix)).map((service) => {
    const match = service.match(/^(.*ó)(ó:\s+\(\$\s*([^)]+)\))ó$/);
    return {
      name: match?.[1]?.trim() || service,
      price: match?.[2]?.replace(/[^\d]/g, '') || '',
    };
  });

const serializeReviewService = ({ name, price }: ReviewServiceItem) =>
  price.trim() ? `${name} ($${price.trim()})` : name;

const parseStoredReviewParts = (services: string[] = []): ReviewPartItem[] =>
  services
    .filter((service) => service.startsWith(reviewPartPrefix))
    .map((service) => {
      const [
        inventoryItemId = '',
        name = '',
        sku = '',
        quantity = '1',
        unit = 'unidad',
        unitCost = '0',
        location = '',
      ] = service.replace(reviewPartPrefix, '').trim().split('|').map((value) => value.trim());
      return {
        inventoryItemId,
        name,
        sku,
        quantity: Math.max(1, parseInt(quantity) || 1),
        unit,
        unitCost: parseInt(unitCost) || 0,
        location,
      };
    })
    .filter((part) => part.inventoryItemId && part.name);

const serializeReviewPart = (part: ReviewPartItem) =>
  `${reviewPartPrefix} ${[
    part.inventoryItemId,
    part.name,
    part.sku,
    part.quantity,
    part.unit,
    part.unitCost,
    part.location,
  ].join('|')}`;


function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  );

  const [accentColor, setAccentColor] = useState(() =>
    localStorage.getItem('accentColor') || '#1f3a5f'
  );

  const [activeSection, setActiveSection] = useState('vehiculos');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [editingVehicle, setEditingVehicle] = useState<(VehicleFormData & { id: string }) | null>(null);

  const [notification, setNotification] = useState<Notification | null>(null);

  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [authToken, setAuthTokenState] = useState<string | null>(() => getAuthToken());

  const [sessionRole, setSessionRole] = useState<'member' | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  const [demoLoading, setDemoLoading] = useState(false);

  const [workshopUsers, setWorkshopUsers] = useState<WorkshopUser[]>(() => {
    const raw = localStorage.getItem('workshopUsers');
    return raw ? JSON.parse(raw) : defaultWorkshopUsers;
  });

  const [userForm, setUserForm] = useState<{ name: string; email: string; role: UserRole }>({
    name: '',
    email: '',
    role: 'Administrativo',
  });

  const [inventoryItems, setInventoryItems] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      sku: string;
      barcode: string;
      stock: number;
      minStock: number;
      unit: string;
      location: string;
      supplier: string;
      cost: number;
      notes: string;
      updated_at: string;
    }>
  >(() => {
    const raw = localStorage.getItem('inventoryItems');
    return raw ? JSON.parse(raw) : [];
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: '',
    sku: '',
    barcode: '',
    stock: 0,
    minStock: 0,
    unit: 'unidad',
    location: '',
    supplier: '',
    cost: 0,
    notes: '',
  });

  const [inventoryAdjust, setInventoryAdjust] = useState({
    itemId: '',
    quantity: 0,
    reason: '',
  });

  const [barcodeInput, setBarcodeInput] = useState('');

  const [vehicleTab, setVehicleTab] = useState<'ingreso' | 'revision' | 'salida'>('ingreso');

  const [reviewVehicleId, setReviewVehicleId] = useState<string | null>(null);

  const [reviewServices, setReviewServices] = useState<ReviewServiceItem[]>([]);

  const [reviewParts, setReviewParts] = useState<ReviewPartItem[]>([]);

  const [serviceSearch, setServiceSearch] = useState('');

  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  const [partSearch, setPartSearch] = useState('');

  const [partPickerOpen, setPartPickerOpen] = useState(false);

  const [reviewNotes, setReviewNotes] = useState('');

  const [readyVehicleIds, setReadyVehicleIds] = useState<string[]>([]);

  const [hiddenSalidaIds, setHiddenSalidaIds] = useState<string[]>([]);

  const [budgetForm, setBudgetForm] = useState({
    customerName: '',
    customerPhone: '',
    patente: '',
    vehicle: '',
    notes: '',
  });

  const [budgetService, setBudgetService] = useState({
    name: '',
    price: 0,
  });

  const [budgetItems, setBudgetItems] = useState<BudgetServiceItem[]>([]);

  useEffect(() => {
    if (!authToken) {
      setSessionRole(null);
      return;
    }
    const loadSession = async () => {
      try {
        await getSession();
        setSessionRole('member');
      } catch (error) {
        clearAuthToken();
        setAuthTokenState(null);
        setSessionRole(null);
      }
    };
    loadSession();
  }, [authToken]);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--accent-soft', toSoftAccent(accentColor));
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem('workshopUsers', JSON.stringify(workshopUsers));
  }, [workshopUsers]);

  useEffect(() => {
    if (!authToken || sessionRole !== 'member') {
      setVehicles([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await getVehicles();
        setVehicles(data);
      } catch (error) {
        if ((error as Error & { status?: number }).status === 401) {
          clearAuthToken();
          setAuthTokenState(null);
          setSessionRole(null);
          return;
        }
        showNotification('error', 'Error al cargar los vehí­culos');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [authToken, sessionRole]);

  useEffect(() => {
    if (reviewVehicleId && !vehicles.find((item) => item.id === reviewVehicleId)) {
      setReviewVehicleId(null);
      setReviewServices([]);
      setReviewParts([]);
      setReviewNotes('');
    }
  }, [vehicles, reviewVehicleId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const session = await loginDemo();
      setAuthToken(session.token);
      setAuthTokenState(session.token);
      setSessionRole('member');
      showNotification('success', 'Acceso demo listo');
    } catch (error) {
      console.error('Demo login failed', error);
      setAuthError('No se pudo iniciar el acceso demo');
    } finally {
      setDemoLoading(false);
    }
  };


  const handleLogout = () => {
    clearAuthToken();
    setAuthTokenState(null);
    setSessionRole(null);
  };

  const handleUserFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = userForm.name.trim();
    const email = userForm.email.trim();

    if (!name || !email) {
      showNotification('error', 'Completa el nombre y correo del usuario');
      return;
    }

    const exists = workshopUsers.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      showNotification('error', 'Ya existe un usuario con ese correo');
      return;
    }

    setWorkshopUsers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        email,
        role: userForm.role,
      },
    ]);
    setUserForm({ name: '', email: '', role: 'Administrativo' });
    showNotification('success', 'Usuario creado correctamente');
  };

  const handleDeleteUser = (id: string) => {
    setWorkshopUsers((prev) => prev.filter((user) => user.id !== id));
    showNotification('success', 'Usuario eliminado');
  };

  const handleInventoryChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setInventoryForm((prev) => ({
      ...prev,
      [name]:
        name === 'stock' || name === 'minStock' || name === 'cost' ? parseInt(value) || 0 : value,
    }));
  };

  const handleInventorySubmit = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      name: inventoryForm.name.trim(),
      category: inventoryForm.category.trim(),
      sku: inventoryForm.sku.trim(),
      barcode: inventoryForm.barcode.trim(),
      stock: inventoryForm.stock,
      minStock: inventoryForm.minStock,
      unit: inventoryForm.unit.trim(),
      location: inventoryForm.location.trim(),
      supplier: inventoryForm.supplier.trim(),
      cost: inventoryForm.cost,
      notes: inventoryForm.notes.trim(),
      updated_at: now,
    };
    setInventoryItems((prev) => [item, ...prev]);
    setInventoryForm({
      name: '',
      category: '',
      sku: '',
      barcode: '',
      stock: 0,
      minStock: 0,
      unit: 'unidad',
      location: '',
      supplier: '',
      cost: 0,
      notes: '',
    });
    showNotification('success', 'Insumo agregado');
  };

  const handleInventoryAdjust = (event: FormEvent) => {
    event.preventDefault();
    const delta = inventoryAdjust.quantity;
    if (!inventoryAdjust.itemId || !delta) {
      return;
    }
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.id === inventoryAdjust.itemId ? {
            ...item,
            stock: item.stock + delta,
            updated_at: new Date().toISOString(),
          } : item
      )
    );
    setInventoryAdjust({ itemId: '', quantity: 0, reason: '' });
    showNotification('success', 'Stock actualizado');
  };

  const handleBarcodeSubmit = (event: FormEvent) => {



    event.preventDefault();



    const code = barcodeInput.trim();



    if (!code) {



      return;



    }



    let matched = false;



    setInventoryItems((prev) =>



      prev.map((item) => {



        if (item.barcode === code || item.sku === code) {



          matched = true;



          return { ...item, stock: item.stock + 1, updated_at: new Date().toISOString() };



        }



        return item;



      })



    );



    setBarcodeInput('');



    showNotification('success', matched ? 'Stock actualizado por código' : 'Código no encontrado');



  };







  const handleBudgetFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setBudgetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBudgetServiceChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setBudgetService((prev) => ({
      ...prev,
      [name]: name === 'price' ? parseInt(value) || 0 : value,
    }));
  };

  const handleAddBudgetService = (event: FormEvent) => {
    event.preventDefault();
    const name = budgetService.name.trim();
    if (!name || budgetService.price <= 0) {
      showNotification('error', 'Agrega un servicio y un valor valido');
      return;
    }

    setBudgetItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        price: budgetService.price,
      },
    ]);
    setBudgetService({ name: '', price: 0 });
    showNotification('success', 'Servicio agregado al presupuesto');
  };

  const handleRemoveBudgetService = (id: string) => {
    setBudgetItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBudget = () => {
    setBudgetForm({
      customerName: '',
      customerPhone: '',
      patente: '',
      vehicle: '',
      notes: '',
    });
    setBudgetService({ name: '', price: 0 });
    setBudgetItems([]);
  };
  const buildVehiclePayload = (vehicle: Vehicle, overrides: Partial<Vehicle>) => ({



    patente: vehicle.patente,



    marca: vehicle.marca,



    modelo: vehicle.modelo,



    ano: vehicle.ano,



    tipo_vehiculo: vehicle.tipo_vehiculo,



    codigo_vin: vehicle.codigo_vin || '',



    codigo_motor: vehicle.codigo_motor || '',

    color: vehicle.color || '',



    kilometraje: vehicle.kilometraje,



    cantidad_combustible: vehicle.cantidad_combustible,



    estado: vehicle.estado,



    customer_name: vehicle.customer_name || '',



    customer_rut: vehicle.customer_rut || '',



    customer_phone: vehicle.customer_phone || '',



    customer_address: vehicle.customer_address || '',



    customer_city: vehicle.customer_city || '',



    servicios: vehicle.servicios || [],

    fallas_detectadas: vehicle.fallas_detectadas || [],



    observaciones: vehicle.observaciones || '',

    comentario_tecnico: vehicle.comentario_tecnico || '',



    ...overrides,



  });







  const updateVehicleRecord = async (



    vehicle: Vehicle,



    overrides: Partial<Vehicle>,



    successMessage: string



  ) => {



    const payload = buildVehiclePayload(vehicle, overrides);



    const updated = await updateVehicle(vehicle.id, payload);



    setVehicles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));



    showNotification('success', successMessage);



  };







  const handleReviewSelect = (vehicle: Vehicle) => {



    setReviewVehicleId(vehicle.id);



    setReviewServices(parseStoredReviewServices(vehicle.servicios));

    setReviewParts(parseStoredReviewParts(vehicle.servicios));



    setReviewNotes(vehicle.observaciones || '');



  };







  const handleAddReviewService = (serviceName: string) => {



    setReviewServices((prev) =>



      prev.some((item) => item.name === serviceName) ? prev : [...prev, { name: serviceName, price: '' }]



    );



    setServiceSearch('');



    setServicePickerOpen(false);



  };



  const handleReviewServicePriceChange = (serviceName: string, price: string) => {



    const normalizedPrice = price.replace(/[^\d]/g, '');



    setReviewServices((prev) =>



      prev.map((item) => (item.name === serviceName ? { ...item, price: normalizedPrice } : item))



    );



  };



  const handleRemoveReviewService = (serviceName: string) => {



    setReviewServices((prev) => prev.filter((item) => item.name !== serviceName));



  };

  const handleAddReviewPart = (item: (typeof inventoryItems)[number]) => {
    if (item.stock <= 0) {
      showNotification('error', 'Este repuesto no tiene stock disponible');
      return;
    }

    setReviewParts((prev) => {
      const existing = prev.find((part) => part.inventoryItemId === item.id);
      const savedQuantity = parseStoredReviewParts(
        vehicles.find((vehicle) => vehicle.id === reviewVehicleId)?.servicios
      ).find((part) => part.inventoryItemId === item.id)?.quantity || 0;
      const availableQuantity = item.stock + savedQuantity;
      if (existing) {
        if (existing.quantity >= availableQuantity) {
          showNotification('error', 'No hay mas stock disponible para este repuesto');
          return prev;
        }
        return prev.map((part) =>
          part.inventoryItemId === item.id ? { ...part, quantity: part.quantity + 1 } : part
        );
      }

      return [
        ...prev,
        {
          inventoryItemId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unit: item.unit || 'unidad',
          unitCost: item.cost || 0,
          location: item.location,
        },
      ];
    });
    setPartSearch('');
    setPartPickerOpen(false);
  };

  const handleReviewPartQuantityChange = (inventoryItemId: string, quantity: number) => {
    const inventoryItem = inventoryItems.find((item) => item.id === inventoryItemId);
    const nextQuantity = Math.max(1, quantity || 1);
    const savedQuantity = parseStoredReviewParts(
      vehicles.find((vehicle) => vehicle.id === reviewVehicleId)?.servicios
    ).find((part) => part.inventoryItemId === inventoryItemId)?.quantity || 0;
    if (inventoryItem && nextQuantity > inventoryItem.stock + savedQuantity) {
      showNotification('error', 'La cantidad supera el stock disponible');
      return;
    }
    setReviewParts((prev) =>
      prev.map((part) =>
        part.inventoryItemId === inventoryItemId ? { ...part, quantity: nextQuantity } : part
      )
    );
  };

  const handleRemoveReviewPart = (inventoryItemId: string) => {
    setReviewParts((prev) => prev.filter((part) => part.inventoryItemId !== inventoryItemId));
  };







  const handleSaveReview = async (statusOverride?: Vehicle['estado']) => {



    const vehicle = vehicles.find((item) => item.id === reviewVehicleId);



    if (!vehicle) {



      showNotification('error', 'Selecciona un vehí­culo para actualizar');



      return;



    }



    const savedParts = parseStoredReviewParts(vehicle.servicios);
    const partDeltas = reviewParts.map((part) => {
      const previousQuantity =
        savedParts.find((savedPart) => savedPart.inventoryItemId === part.inventoryItemId)?.quantity || 0;
      return {
        inventoryItemId: part.inventoryItemId,
        delta: part.quantity - previousQuantity,
      };
    });
    savedParts.forEach((savedPart) => {
      if (!reviewParts.some((part) => part.inventoryItemId === savedPart.inventoryItemId)) {
        partDeltas.push({
          inventoryItemId: savedPart.inventoryItemId,
          delta: -savedPart.quantity,
        });
      }
    });

    const missingStock = partDeltas.find((partDelta) => {
      if (partDelta.delta <= 0) {
        return false;
      }
      const inventoryItem = inventoryItems.find((item) => item.id === partDelta.inventoryItemId);
      return !inventoryItem || inventoryItem.stock < partDelta.delta;
    });

    if (missingStock) {
      const inventoryItem = inventoryItems.find((item) => item.id === missingStock.inventoryItemId);
      showNotification(
        'error',
        inventoryItem
          ? `Stock insuficiente para ${inventoryItem.name}`
          : 'Uno de los repuestos ya no existe en inventario'
      );
      return;
    }

    try {



      await updateVehicleRecord(



        vehicle,



        {



          estado: statusOverride || vehicle.estado,



          servicios: [
            ...reviewServices.map(serializeReviewService),
            ...reviewParts.map(serializeReviewPart),
          ],



          observaciones: reviewNotes,



        },



        statusOverride ? 'vehí­culo enviado a salida' : 'Servicios guardados'



      );

      setInventoryItems((prev) =>
        prev.map((item) => {
          const partDelta = partDeltas.find((delta) => delta.inventoryItemId === item.id);
          if (!partDelta || partDelta.delta === 0) {
            return item;
          }
          return {
            ...item,
            stock: item.stock - partDelta.delta,
            updated_at: new Date().toISOString(),
          };
        })
      );



      if (statusOverride === 'Entregado') {



        setVehicleTab('salida');



      }



    } catch (error) {



      console.error('Review update failed', error);



      showNotification('error', 'No se pudo actualizar el vehí­culo');



    }



  };







  const handleSendToRevision = async (vehicle: Vehicle) => {



    try {



      await updateVehicleRecord(vehicle, { estado: 'En revision' }, 'vehí­culo enviado a revisión');



      setVehicleTab('revision');



      setReviewVehicleId(vehicle.id);



      setReviewServices(parseStoredReviewServices(vehicle.servicios));

      setReviewParts(parseStoredReviewParts(vehicle.servicios));



      setReviewNotes(vehicle.observaciones || '');



    } catch (error) {



      console.error('Send to revision failed', error);



      showNotification('error', 'No se pudo enviar a revisión');



    }



  };







  const escapeHtml = (value: string) =>



    value



      .replace(/&/g, '&amp;')



      .replace(/</g, '&lt;')



      .replace(/>/g, '&gt;')



      .replace(/"/g, '&quot;')



      .replace(/'/g, '&#39;');







  const exportVehiclePdf = (vehicle: Vehicle) => {



    const ingreso = new Date(vehicle.fecha_ingreso).toLocaleDateString('es-ES', {



      day: '2-digit',



      month: '2-digit',



      year: 'numeric',



    });







    const services = parseStoredReviewServices(vehicle.servicios).map(serializeReviewService);
    const parts = parseStoredReviewParts(vehicle.servicios);
    const failures = vehicle.fallas_detectadas || [];



    const html = `



      <html>



        <head>



          <title>Salida de vehí­culo</title>



          <style>



            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }



            h1 { font-size: 20px; margin-bottom: 8px; }



            h2 { font-size: 14px; margin: 20px 0 8px; }



            p { margin: 0 0 8px; font-size: 12px; color: #111827; }



            .muted { color: #6b7280; }



            table { width: 100%; border-collapse: collapse; font-size: 12px; }



            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }



            th { background: #f9fafb; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }



          </style>



        </head>



        <body>



          <h1>Reporte de salida de vehí­culo</h1>



<p class="muted">Fecha ingreso: ${escapeHtml(ingreso)}</p>



<h2>Cliente</h2>



<p><strong>Nombre:</strong> ${escapeHtml(vehicle.customer_name || '-')}</p>



<p><strong>RUT:</strong> ${escapeHtml(vehicle.customer_rut || '-')}</p>



<p><strong>Telí©fono:</strong> ${escapeHtml(vehicle.customer_phone || '-')}</p>



<p><strong>Dirección:</strong> ${escapeHtml(vehicle.customer_address || '-')}</p>



<p><strong>Correo:</strong> ${escapeHtml(vehicle.customer_city || '-')}</p>



<h2>vehí­culo</h2>



<table>



  <tbody>



    <tr><th>Patente</th><td>${escapeHtml(vehicle.patente)}</td></tr>



    <tr><th>Marca</th><td>${escapeHtml(vehicle.marca)}</td></tr>



    <tr><th>Modelo</th><td>${escapeHtml(vehicle.modelo)}</td></tr>



    <tr><th>Año</th><td>${vehicle.ano}</td></tr>



                              {vehicle.tipo_vehiculo} Â· {vehicle.ano}



    <tr><th>Kilometraje</th><td>${vehicle.kilometraje}</td></tr>



    <tr><th>Combustible</th><td>${vehicle.cantidad_combustible}%</td></tr>



    <tr><th>Color ingreso</th><td>${escapeHtml(vehicle.color || '-')}</td></tr>



    <tr><th>Estado</th><td>${escapeHtml(vehicle.estado)}</td></tr>



  </tbody>



</table>



<h2>Servicios realizados</h2>



${services.length === 0



        ? '<p class="muted">Sin servicios registrados.</p>'



        : `<ul>${services.map((service) => `<li>${escapeHtml(service)}</li>`).join('')}</ul>`



      }



<h2>Fallas declaradas al ingreso</h2>

${failures.length === 0
        ? '<p class="muted">Sin fallas seleccionadas.</p>'
        : `<ul>${failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join('')}</ul>`
      }



<h2>Repuestos utilizados</h2>

${parts.length === 0
        ? '<p class="muted">Sin repuestos registrados.</p>'
        : `<ul>${parts.map((part) => `<li>${escapeHtml(`${part.name} x${part.quantity} ${part.unit}`)}</li>`).join('')}</ul>`
      }



<h2>Detalle del trabajo</h2>



<p>${escapeHtml(vehicle.observaciones || 'Sin observaciones')}</p>

<h2>Comentario tecnico</h2>

<p>${escapeHtml(vehicle.comentario_tecnico || 'Sin comentario tecnico')}</p>



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







  const handleVehicleReady = (vehicle: Vehicle) => {



    setReadyVehicleIds((prev) => (prev.includes(vehicle.id) ? prev : [...prev, vehicle.id]));



    setTimeout(() => {



      setHiddenSalidaIds((prev) =>



        prev.includes(vehicle.id) ? prev : [...prev, vehicle.id]



      );



      showNotification('success', `vehí­culo ${vehicle.patente} listo`);



      setVehicleTab('ingreso');



    }, 400);



  };







  const handleNotify = (vehicle: Vehicle) => {



    const contact = vehicle.customer_phone || 'cliente';



    showNotification('success', `Aviso enviado a ${contact}`);



  };







  const handleSubmit = async (formData: VehicleFormData) => {



    try {



      if (editingVehicle) {



        const updated = await updateVehicle(editingVehicle.id, formData);



        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));



        showNotification('success', 'vehí­culo actualizado correctamente');



        setEditingVehicle(null);



      } else {



        const created = await createVehicle(formData);



        setVehicles((prev) => [created, ...prev]);



        showNotification('success', 'vehí­culo registrado correctamente');



      }



    } catch (error) {



      const message =



        (error as Error & { status?: number }).status === 409



          ? 'La patente ya está registrada'



          : 'Error al guardar el vehí­culo';



      showNotification('error', message);



      console.error('Error:', error);



    }



  };


  // const handleEdit = (vehicle: Vehicle) => {

  //   setEditingVehicle(vehicle);

  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // };


  const metrics = {



    total: vehicles.length,



    enTaller: vehicles.filter((v) => v.estado === 'En taller').length,



    entregados: vehicles.filter((v) => v.estado === 'Entregado').length,



    enRevision: vehicles.filter((v) => v.estado === 'En revision').length,



  };



  const vehiclesEnTaller = vehicles.filter((vehicle) => vehicle.estado === 'En taller');



  const vehiclesEnRevision = vehicles.filter((vehicle) => vehicle.estado === 'En revision');



  const vehiclesEntregados = vehicles.filter((vehicle) => vehicle.estado === 'Entregado');

  const activeReviewVehicle =

    vehicles.find((vehicle) => vehicle.id === reviewVehicleId) || vehiclesEnRevision[0] || null;

  const filteredServiceCatalog = serviceCatalogByCategory.flatMap(({ category, services }) =>
    services
      .filter((service) => {
        const normalizedSearch = serviceSearch.toLowerCase();
        const matchesSearch =
          service.toLowerCase().includes(normalizedSearch) ||
          category.toLowerCase().includes(normalizedSearch);
        const alreadySelected = reviewServices.some((item) => item.name === service);
        return matchesSearch && !alreadySelected;
      })
      .map((service) => ({ category, name: service }))
  );

  const filteredServiceCatalogByCategory = filteredServiceCatalog.reduce<
    Array<{ category: string; services: CatalogService[] }>
  >((groups, service) => {
    const existingGroup = groups.find((group) => group.category === service.category);
    if (existingGroup) {
      existingGroup.services.push(service);
      return groups;
    }
    return [...groups, { category: service.category, services: [service] }];
  }, []);

  const filteredInventoryParts = inventoryItems.filter((item) => {
    const normalizedSearch = partSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.category.toLowerCase().includes(normalizedSearch) ||
      item.sku.toLowerCase().includes(normalizedSearch) ||
      item.barcode.toLowerCase().includes(normalizedSearch) ||
      item.location.toLowerCase().includes(normalizedSearch)
    );
  });



  useEffect(() => {

    if (!reviewVehicleId && vehiclesEnRevision.length > 0) {

      handleReviewSelect(vehiclesEnRevision[0]);

    }

  }, [reviewVehicleId, vehiclesEnRevision]);



  const lowStockItems = inventoryItems.filter(



    (item) => item.minStock > 0 && item.stock <= item.minStock



  );



  const notifications = [

    lowStockItems.length > 0



      ? {



        id: 'stock',



        title: 'Stock bajo',



          body: `${lowStockItems.length} insumos bajo mínimo.`,



        time: 'Hoy',



      }



      : null,



    vehiclesEnRevision.length > 0



      ? {



        id: 'revision',



          title: 'vehículos en revisión',



        body: `${vehiclesEnRevision.length} trabajos en curso.`,



        time: 'Hoy',



      }



      : null,



  ].filter(Boolean) as Array<{ id: string; title: string; body: string; time: string }>;



  const totalStockValue = inventoryItems.reduce(



    (sum, item) => sum + item.stock * (item.cost || 0),



    0



  );







  const budgetTotal = budgetItems.reduce((sum, item) => sum + item.price, 0);

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900">Acceso al sistema</h1>
          <p className="text-sm text-gray-500 mt-2">
            Ingresa con el acceso general para trabajar con una empresa persistente.
          </p>

          {authError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="mt-6 w-full rounded-lg btn-primary px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {demoLoading ? 'Preparando acceso...' : 'Entrar al sistema'}
          </button>
        </div>
      </div>
    );
  }

  if (!sessionRole) {



    return (



      <div className="min-h-screen bg-gray-50 flex items-center justify-center">



        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">



          <p className="text-gray-500">Cargando Sesión...</p>



        </div>



      </div>



    );



  }







  return (



    <div className="min-h-screen bg-gray-50">



      <Sidebar



        activeSection={activeSection}



        onSectionChange={setActiveSection}



        isOpen={sidebarOpen}



        onClose={() => setSidebarOpen(false)}



      />







      <div className="lg:ml-64">



        <Header



          onMenuClick={() => setSidebarOpen(true)}



          theme={theme}



          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}



          notifications={notifications}



          onLogout={handleLogout}



        />







        {notification && (



          <div className="fixed top-4 right-4 z-50 animate-slide-in">



            <div



              className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${notification.type === 'success'



                  ? 'bg-green-50 text-green-800 border border-green-200'



                  : 'bg-red-50 text-red-800 border border-red-200'



                }`}



            >



              {notification.type === 'success' ? (



                <CheckCircle className="w-5 h-5" />



              ) : (



                <AlertCircle className="w-5 h-5" />



              )}



              <p className="font-medium">{notification.message}</p>



            </div>



          </div>



        )}







        <main className="p-8">



          {activeSection === 'vehiculos' && (



            <>



              <div className="sticky top-4 z-20 mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">



                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">



                  {[



                    { id: 'ingreso', label: 'Ingreso de vehí­culos' },



                    { id: 'revision', label: 'En revisión' },



                    { id: 'salida', label: 'Salida vehí­culos' },



                  ].map((tab) => (



                    <button



                      key={tab.id}



                      onClick={() => setVehicleTab(tab.id as typeof vehicleTab)}



                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${vehicleTab === tab.id



                          ? 'btn-primary'



                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'



                        }`}



                    >



                      {tab.label}



                    </button>



                  ))}

                  {vehicleTab === 'ingreso' && (
                    <div className="flex flex-wrap gap-3 lg:ml-auto">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('vehicle-form-clear'))}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-700 focus:ring-4 focus:ring-red-200"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar formulario
                      </button>
                      <button
                        type="submit"
                        form="vehicle-entry-form"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200"
                      >
                        <Send className="h-4 w-4" />
                        Ingresar Vehículo
                      </button>
                    </div>
                  )}



                </div>



              </div>







              {vehicleTab === 'ingreso' && (



                <>



                  <div className="mb-8">



                    <VehicleForm



                      onSubmit={handleSubmit}



                      editingVehicle={editingVehicle}



                      onCancelEdit={() => setEditingVehicle(null)}



                      existingVehicles={vehicles}



                    />



                  </div>







                  <div className="hidden">



                    <h3 className="text-lg font-semibold text-gray-900 mb-4">vehí­culos en taller</h3>



                    {vehiclesEnTaller.length === 0 ? (



                      <p className="text-sm text-gray-500">No hay vehí­culos en taller.</p>



                    ) : (



                      <div className="space-y-3">



                        {vehiclesEnTaller.map((vehicle) => (



                          <div



                            key={vehicle.id}



                            className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"



                          >



                            <div>



                              <p className="text-sm font-semibold text-gray-900 uppercase">



                                {vehicle.patente}



                              </p>



                              <p className="text-sm text-gray-500">



                                {vehicle.marca} {vehicle.modelo} Â· {vehicle.customer_name || 'Sin cliente'}



                              </p>



                            </div>



                            <button



                              onClick={() => handleSendToRevision(vehicle)}



                              className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold"



                            >



                              Enviar a revisión



                            </button>



                          </div>



                        ))}



                      </div>



                    )}



                  </div>



                </>



              )}







              {vehicleTab === 'revision' && (



                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                    <h3 className="text-lg font-semibold text-gray-900 mb-4">En revisión</h3>



                    {activeReviewVehicle && (



                      <div className="mb-6 rounded-lg border border-blue-500 bg-blue-50 px-4 py-3">



                        <p className="text-sm font-semibold text-gray-900 uppercase">



                          {activeReviewVehicle.patente}



                        </p>



                        <p className="mt-1 text-xs text-gray-600">



                          {activeReviewVehicle.marca} {activeReviewVehicle.modelo} ·{' '}
                          {activeReviewVehicle.customer_name || 'Sin cliente'}



                        </p>



                      </div>



                    )}



                    <div className="mb-4 flex items-center justify-between gap-3">



                      <h4 className="text-sm font-semibold text-gray-900">Vehí­culos en revisión</h4>



                      <span className="text-xs text-gray-500">{vehiclesEnRevision.length} activos</span>



                    </div>



                    {vehiclesEnRevision.length === 0 ? (



                      <p className="text-sm text-gray-500">No hay vehí­culos en revisión.</p>



                    ) : (



                      <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">



                        {vehiclesEnRevision.map((vehicle) => (



                          <button



                            key={vehicle.id}



                            onClick={() => handleReviewSelect(vehicle)}



                            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                              reviewVehicleId === vehicle.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}



                          >



                            <p className="text-sm font-semibold text-gray-900 uppercase">



                              {vehicle.patente}



                            </p>



                            <p className="text-xs text-gray-500">



                              {vehicle.marca} {vehicle.modelo} Â· {vehicle.customer_name || 'Sin cliente'}



                            </p>

                            <p className="mt-2 text-xs font-semibold text-gray-500">
                              Sigue en revisión hasta pasar a salida
                            </p>



                          </button>



                        ))}



                      </div>



                    )}



                  </div>







                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">



                    {activeReviewVehicle ? (



                      <>



                        <div className="mb-4 flex items-start justify-between gap-4">



                          <div>



                            <h3 className="text-lg font-semibold text-gray-900">Servicios realizados</h3>



                            <p className="text-sm text-gray-500">



                              Busca procedimientos, agrí©galos con valor y guarda el trabajo ejecutado.



                            </p>



                          </div>



                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button



                              type="button"



                              onClick={() => setServicePickerOpen((prev) => !prev)}



                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



                            >



                              {servicePickerOpen ? 'Cerrar buscador' : 'Buscar servicios'}



                            </button>
                            <button
                              type="button"
                              onClick={() => setPartPickerOpen((prev) => !prev)}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              {partPickerOpen ? 'Cerrar repuestos' : 'Buscar repuestos'}
                            </button>
                          </div>



                        </div>







                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold text-amber-900">Fallas declaradas al ingreso</h4>
                            <span className="text-xs font-semibold text-amber-800">
                              {activeReviewVehicle.fallas_detectadas?.length || 0} registrada(s)
                            </span>
                          </div>

                          {activeReviewVehicle.fallas_detectadas && activeReviewVehicle.fallas_detectadas.length > 0 ? (
                            <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {activeReviewVehicle.fallas_detectadas.map((failure) => (
                                <li
                                  key={failure}
                                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800"
                                >
                                  {failure}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-amber-800">No se registraron fallas al ingreso.</p>
                          )}

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Observación inicial
                              </p>
                              <p className="mt-1 text-sm text-gray-800">
                                {activeReviewVehicle.observaciones || 'Sin observaciones.'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Comentario técnico
                              </p>
                              <p className="mt-1 text-sm text-gray-800">
                                {activeReviewVehicle.comentario_tecnico || 'Sin comentario técnico.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative mb-6">



                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">



                            <div className="relative">



                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />



                              <input



                                value={serviceSearch}



                                onFocus={() => setServicePickerOpen(true)}



                                onChange={(event) => {



                                  setServiceSearch(event.target.value);



                                  setServicePickerOpen(true);



                                }}



                                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"



                                placeholder="Buscar procedimiento o sistema..."



                              />



                            </div>



                            {servicePickerOpen && (



                              <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg">



                                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">



                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">



                                    Catálogo de procedimientos



                                  </p>



                                  <button



                                    type="button"



                                    onClick={() => setServicePickerOpen(false)}



                                    className="rounded p-1 text-gray-500 hover:bg-gray-100"



                                  >



                                    <X className="h-4 w-4" />



                                  </button>



                                </div>



                                <div className="max-h-72 overflow-y-auto p-2">



                                  {filteredServiceCatalog.length === 0 ? (



                                    <p className="px-3 py-2 text-sm text-gray-500">



                                      No hay servicios disponibles con esa bíºsqueda.



                                    </p>



                                  ) : (
                                    filteredServiceCatalogByCategory.map((group) => (
                                      <div key={group.category} className="py-1">
                                        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          {group.category}
                                        </p>
                                        {group.services.map((service) => (
                                          <button
                                            key={service.name}
                                            type="button"
                                            onClick={() => handleAddReviewService(service.name)}
                                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                          >
                                            <span>{service.name}</span>
                                            <span className="text-xs font-semibold text-blue-600">Agregar</span>
                                          </button>
                                        ))}
                                      </div>
                                    ))
                                  )}



                                </div>



                              </div>



                            )}



                          </div>



                        </div>



                        {partPickerOpen && (
                          <div className="relative mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <input
                                value={partSearch}
                                onChange={(event) => setPartSearch(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="Buscar repuesto por nombre, SKU, codigo o ubicacion..."
                              />
                            </div>

                            <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg">
                              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Repuestos en inventario
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setPartPickerOpen(false)}
                                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="max-h-72 overflow-y-auto p-2">
                                {filteredInventoryParts.length === 0 ? (
                                  <p className="px-3 py-2 text-sm text-gray-500">
                                    No hay repuestos disponibles con esa busqueda.
                                  </p>
                                ) : (
                                  filteredInventoryParts.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleAddReviewPart(item)}
                                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                    >
                                      <span>
                                        <span className="block font-semibold text-gray-900">{item.name}</span>
                                        <span className="block text-xs text-gray-500">
                                          {item.category} · SKU: {item.sku || '-'} · Bodega: {item.location || '-'}
                                        </span>
                                      </span>
                                      <span
                                        className={`text-xs font-semibold ${
                                          item.stock > 0 ? 'text-emerald-700' : 'text-red-600'
                                        }`}
                                      >
                                        Stock {item.stock} {item.unit || ''}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}



                        <div className="mb-6 space-y-3">



                          {reviewServices.length === 0 ? (



                            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">



                              No hay servicios seleccionados todaví­a.



                            </p>



                          ) : (



                            reviewServices.map((service) => (



                              <div



                                key={service.name}



                                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_180px_44px]"



                              >



                                <div>



                                  <p className="text-sm font-semibold text-gray-900">{service.name}</p>



                                  <p className="text-xs text-gray-500">



                                    Servicio aplicable a sistemas automotrices.



                                  </p>



                        </div>



                        <div className="mb-6 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-gray-900">Repuestos utilizados</h4>
                            <span className="text-xs text-gray-500">{reviewParts.length} seleccionado(s)</span>
                          </div>

                          {reviewParts.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                              No hay repuestos seleccionados todavia.
                            </p>
                          ) : (
                            reviewParts.map((part) => {
                              const inventoryItem = inventoryItems.find((item) => item.id === part.inventoryItemId);
                              const savedQuantity =
                                parseStoredReviewParts(activeReviewVehicle.servicios).find(
                                  (savedPart) => savedPart.inventoryItemId === part.inventoryItemId
                                )?.quantity || 0;
                              const availableQuantity = (inventoryItem?.stock || 0) + savedQuantity;
                              return (
                                <div
                                  key={part.inventoryItemId}
                                  className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{part.name}</p>
                                    <p className="text-xs text-gray-500">
                                      SKU: {part.sku || '-'} · Bodega: {part.location || '-'} · Stock disponible:{' '}
                                      {availableQuantity} {part.unit}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                                      Cantidad
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={Math.max(1, availableQuantity)}
                                      value={part.quantity}
                                      onChange={(event) =>
                                        handleReviewPartQuantityChange(
                                          part.inventoryItemId,
                                          parseInt(event.target.value) || 1
                                        )
                                      }
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveReviewPart(part.inventoryItemId)}
                                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                      title="Eliminar repuesto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>



                        <div>



                                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">



                                    Valor



                                  </label>



                                  <input



                                    type="text"



                                    inputMode="numeric"



                                    value={service.price}



                                    onChange={(event) =>
                                      handleReviewServicePriceChange(service.name, event.target.value)
                                    }



                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"



                                    placeholder="15000"



                                  />



                                </div>



                                <div className="flex items-end">



                                  <button



                                    type="button"



                                    onClick={() => handleRemoveReviewService(service.name)}



                                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"



                                    title="Eliminar servicio"



                                  >



                                    <Trash2 className="h-4 w-4" />



                                  </button>



                                </div>



                              </div>



                            ))



                          )}



                        </div>







                        <div>



                          <label className="block text-sm font-medium text-gray-700 mb-2">



                            Detalle del trabajo



                          </label>



                          <textarea



                            value={reviewNotes}



                            onChange={(event) => setReviewNotes(event.target.value)}



                            rows={5}



                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"



                            placeholder="Describe el trabajo realizado..."



                          />



                        </div>







                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-6">



                          <button



                            onClick={() => handleSaveReview()}



                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



                          >



                            Guardar selección



                          </button>



                          <button



                            onClick={() => handleSaveReview('Entregado')}



                            className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold"



                          >



                            Enviar a salida



                          </button>



                        </div>



                      </>



                    ) : (



                      <p className="text-sm text-gray-500">Enví­a un vehí­culo a revisión para registrar servicios.</p>



                    )}



                  </div>



                </div>



              )}







              {vehicleTab === 'salida' && (



                <div className="space-y-4">



                  {vehiclesEntregados.filter((vehicle) => !hiddenSalidaIds.includes(vehicle.id))



                    .length === 0 ? (



                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-sm text-gray-500">



                      No hay vehí­culos en salida.



                    </div>



                  ) : (



                    vehiclesEntregados



                      .filter((vehicle) => !hiddenSalidaIds.includes(vehicle.id))



                      .map((vehicle) => (



                        <div



                          key={vehicle.id}



                          className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm fade-item ${readyVehicleIds.includes(vehicle.id) ? 'fade-out' : ''



                            }`}



                        >



                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">



                            <div>



                              <h3 className="text-lg font-semibold text-gray-900 uppercase">



                                {vehicle.patente}



                              </h3>



                              <p className="text-sm text-gray-500">



                              {vehicle.marca} {vehicle.modelo} · {vehicle.customer_name || 'Sin cliente'}



                              </p>



                            </div>



                            <div className="flex flex-col gap-2 sm:flex-row">



                              <button



                                onClick={() => exportVehiclePdf(vehicle)}



                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



                              >



                                Exportar PDF



                              </button>



                              <button



                                onClick={() => handleVehicleReady(vehicle)}



                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"



                              >



                              vehículo listo



                              </button>



                            </div>



                          </div>







                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">



                            <div className="rounded-lg border border-gray-200 p-4">



                              <p className="text-xs uppercase tracking-wide text-gray-500">Cliente</p>



                              <p className="text-sm font-semibold text-gray-900">



                                {vehicle.customer_name || 'Sin cliente'}



                              </p>



                              <p className="text-xs text-gray-500">{vehicle.customer_rut || '-'}</p>



                              <p className="text-xs text-gray-500">{vehicle.customer_phone || '-'}</p>



                              <p className="text-xs text-gray-500">{vehicle.customer_address || '-'}</p>
                              <p className="text-xs text-gray-500">{vehicle.customer_city || '-'}</p>



                            </div>



                            <div className="rounded-lg border border-gray-200 p-4">



                            <p className="text-xs uppercase tracking-wide text-gray-500">vehículo</p>



                              <p className="text-sm text-gray-700">



                              {vehicle.tipo_vehiculo} · {vehicle.ano}



                              </p>



                              <p className="text-xs text-gray-500">



                              KM: {vehicle.kilometraje} · Combustible: {vehicle.cantidad_combustible}%



                              </p>

                              <p className="text-xs text-gray-500">Color ingreso: {vehicle.color || '-'}</p>

                              <p className="text-xs text-gray-500">
                                Fallas: {vehicle.fallas_detectadas?.length || 0}
                              </p>



                              <p className="text-xs text-gray-500">Estado: {vehicle.estado}</p>



                            </div>



                            <div className="rounded-lg border border-gray-200 p-4">



                              <p className="text-xs uppercase tracking-wide text-gray-500">Servicios</p>



                              {parseStoredReviewServices(vehicle.servicios).length > 0 ? (



                                <ul className="text-xs text-gray-700 list-disc pl-4 mt-2 space-y-1">



                                  {parseStoredReviewServices(vehicle.servicios).map((service) => (



                                    <li key={service.name}>{serializeReviewService(service)}</li>



                                  ))}



                                </ul>



                              ) : (



                                <p className="text-xs text-gray-500 mt-2">Sin servicios registrados.</p>



                              )}

                              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Fallas ingreso</p>

                              {vehicle.fallas_detectadas && vehicle.fallas_detectadas.length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                                  {vehicle.fallas_detectadas.map((failure) => (
                                    <li key={failure}>{failure}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-gray-500">Sin fallas seleccionadas.</p>
                              )}

                              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Repuestos</p>

                              {parseStoredReviewParts(vehicle.servicios).length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                                  {parseStoredReviewParts(vehicle.servicios).map((part) => (
                                    <li key={part.inventoryItemId}>
                                      {part.name} x{part.quantity} {part.unit}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-gray-500">Sin repuestos registrados.</p>
                              )}



                            </div>



                          </div>







                          <div className="mt-4 rounded-lg border border-gray-200 p-4">



                            <p className="text-xs uppercase tracking-wide text-gray-500">Detalle del trabajo</p>



                            <p className="text-sm text-gray-700 mt-2">



                              {vehicle.observaciones || 'Sin observaciones.'}



                            </p>



                          </div>



                        </div>



                      ))



                  )}



                </div>



              )}



            </>



          )}







          {activeSection === 'dashboard' && (



            <>



              <MetricsCards



                totalvehicles={metrics.total}



                enTaller={metrics.enTaller}



                entregados={metrics.entregados}



                enRevision={metrics.enRevision}



              />







              {loading ? (



                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">



                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>



                  <p className="text-gray-500 mt-4">Cargando historial...</p>



                </div>



              ) : (



                <VehicleHistoryTable vehicles={vehicles} />



              )}



            </>



          )}







          {activeSection === 'inventario' && (



            <div className="space-y-6">



              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                  <p className="text-sm text-gray-500">Items totales</p>



                  <p className="text-2xl font-bold text-gray-900">{inventoryItems.length}</p>



                </div>



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                  <p className="text-sm text-gray-500">Stock bajo</p>



                  <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>



                </div>



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                  <p className="text-sm text-gray-500">Valor aproximado</p>



                  <p className="text-2xl font-bold text-gray-900">



                    ${totalStockValue.toLocaleString('es-CL')}



                  </p>



                </div>



              </div>







              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">



                  <h3 className="text-lg font-semibold text-gray-900 mb-4">



                    Registro de insumos y repuestos



                  </h3>



                  <form onSubmit={handleInventorySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">



                    <input



                      name="name"



                      value={inventoryForm.name}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Nombre del insumo"



                      required



                    />



                    <input



                      name="category"



                      value={inventoryForm.category}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Categorí­a (aceites, frenos...)"



                      required



                    />



                    <input



                      name="sku"



                      value={inventoryForm.sku}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="SKU interno"



                    />



                    <input



                      name="barcode"



                      value={inventoryForm.barcode}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Código de barras"



                    />



                    <input



                      type="number"



                      name="stock"



                      value={inventoryForm.stock}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Stock inicial"



                    />



                    <input



                      type="number"



                      name="minStock"



                      value={inventoryForm.minStock}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Stock mí­nimo"



                    />



                    <input



                      name="unit"



                      value={inventoryForm.unit}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Unidad (litros, unidades)"



                    />



                    <input



                      name="location"



                      value={inventoryForm.location}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Ubicación en bodega"



                    />



                    <input



                      name="supplier"



                      value={inventoryForm.supplier}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Proveedor"



                    />



                    <input



                      type="number"



                      name="cost"



                      value={inventoryForm.cost}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Costo unitario"



                    />



                    <input



                      name="notes"



                      value={inventoryForm.notes}



                      onChange={handleInventoryChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none md:col-span-2"



                      placeholder="Notas o especificaciones"



                    />



                    <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold md:col-span-2">



                      Guardar insumo



                    </button>



                  </form>



                </div>







                <div className="space-y-6">



                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                    <h3 className="text-lg font-semibold text-gray-900 mb-4">



                      Ingreso por código de barras



                    </h3>



                    <form onSubmit={handleBarcodeSubmit} className="space-y-3">



                      <input



                        value={barcodeInput}



                        onChange={(event) => setBarcodeInput(event.target.value)}



                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                        placeholder="Escanear código"



                      />



                      <button type="submit" className="btn-primary w-full rounded-lg px-4 py-2 text-sm font-semibold">



                        Registrar ingreso rápido



                      </button>



                    </form>



                  </div>







                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajuste rapido</h3>



                    <form onSubmit={handleInventoryAdjust} className="space-y-3">



                      <select



                        value={inventoryAdjust.itemId}



                        onChange={(event) =>



                          setInventoryAdjust((prev) => ({ ...prev, itemId: event.target.value }))



                        }



                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      >



                        <option value="">Selecciona un insumo</option>



                        {inventoryItems.map((item) => (



                          <option key={item.id} value={item.id}>



                            {item.name}



                          </option>



                        ))}



                      </select>



                      <input



                        type="number"



                        value={inventoryAdjust.quantity}



                        onChange={(event) =>



                          setInventoryAdjust((prev) => ({



                            ...prev,



                            quantity: parseInt(event.target.value) || 0,



                          }))



                        }



                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                        placeholder="Cantidad (+/-)"



                      />



                      <input



                        value={inventoryAdjust.reason}



                        onChange={(event) =>



                          setInventoryAdjust((prev) => ({ ...prev, reason: event.target.value }))



                        }



                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                        placeholder="Motivo"



                      />



                      <button type="submit" className="btn-primary w-full rounded-lg px-4 py-2 text-sm font-semibold">



                        Aplicar ajuste



                      </button>



                    </form>



                  </div>



                </div>



              </div>







              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">



                <div className="p-6 border-b border-gray-200">



                  <h3 className="text-lg font-semibold text-gray-900">Listado de insumos</h3>



                </div>



                {inventoryItems.length === 0 ? (



                  <div className="p-6 text-sm text-gray-500">No hay insumos registrados.</div>



                ) : (



                  <div className="overflow-x-auto">



                    <table className="w-full text-sm">



                      <thead className="bg-gray-50 border-b border-gray-200">



                        <tr>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Insumo</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoria</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stock</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Minimo</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ubicacion</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Proveedor</th>



                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actualizado</th>



                        </tr>



                      </thead>



                      <tbody className="divide-y divide-gray-200">



                        {inventoryItems.map((item) => (



                          <tr key={item.id} className="hover:bg-gray-50">



                            <td className="px-4 py-3">



                              <p className="font-semibold text-gray-900">{item.name}</p>



                              <p className="text-xs text-gray-500">SKU: {item.sku || '-'}</p>



                              <p className="text-xs text-gray-500">Código: {item.barcode || '-'}</p>



                            </td>



                            <td className="px-4 py-3 text-gray-700">{item.category}</td>



                            <td className="px-4 py-3 text-gray-700">{item.stock}</td>



                            <td className="px-4 py-3 text-gray-700">{item.minStock}</td>



                            <td className="px-4 py-3 text-gray-700">{item.location || '-'}</td>



                            <td className="px-4 py-3 text-gray-700">{item.supplier || '-'}</td>



                            <td className="px-4 py-3 text-gray-500">



                              {new Date(item.updated_at).toLocaleDateString('es-ES')}



                            </td>



                          </tr>



                        ))}



                      </tbody>



                    </table>



                  </div>



                )}



              </div>



            </div>



          )}







          {activeSection === 'presupuesto' && (



            <div className="space-y-6">



              <div className="flex flex-col gap-2">



                <h2 className="text-2xl font-bold text-gray-900">Presupuesto</h2>



                <p className="text-sm text-gray-500">Arma un presupuesto simple de servicios mecánicos.</p>



              </div>



              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">



                  <div className="mb-6 flex items-center gap-3">



                    <div className="rounded-lg bg-accent-soft p-3 text-accent">



                      <Calculator className="h-5 w-5" />



                    </div>



                    <div>



                      <h3 className="text-lg font-semibold text-gray-900">Datos del presupuesto</h3>



                      <p className="text-sm text-gray-500">Cliente, vehículo y detalle del trabajo solicitado.</p>



                    </div>



                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">



                    <input



                      name="customerName"



                      value={budgetForm.customerName}



                      onChange={handleBudgetFormChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Nombre del cliente"



                    />



                    <input



                      name="customerPhone"



                      value={budgetForm.customerPhone}



                      onChange={handleBudgetFormChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Teléfono"



                    />



                    <input



                      name="patente"



                      value={budgetForm.patente}



                      onChange={handleBudgetFormChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"



                      placeholder="Patente"



                    />



                    <input



                      name="vehicle"



                      value={budgetForm.vehicle}



                      onChange={handleBudgetFormChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Vehículo"



                    />



                    <textarea



                      name="notes"



                      value={budgetForm.notes}



                      onChange={handleBudgetFormChange}



                      rows={4}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none md:col-span-2"



                      placeholder="Observaciones del presupuesto"



                    />



                  </div>



                  <form onSubmit={handleAddBudgetService} className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">



                    <select



                      name="name"



                      value={budgetService.name}



                      onChange={handleBudgetServiceChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                    >



                      <option value="">Selecciona un servicio</option>



                      {serviceCatalog.map((service) => (



                        <option key={service} value={service}>



                          {service}



                        </option>



                      ))}



                    </select>



                    <input



                      type="number"



                      name="price"



                      value={budgetService.price}



                      onChange={handleBudgetServiceChange}



                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                      placeholder="Valor"



                      min="0"



                    />



                    <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2">



                      <Plus className="h-4 w-4" />



                      Agregar



                    </button>



                  </form>



                </div>



                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                  <h3 className="text-lg font-semibold text-gray-900">Resumen</h3>



                  <div className="mt-4 space-y-3">



                    <p className="text-sm text-gray-500">Cliente</p>



                    <p className="text-sm font-semibold text-gray-900">{budgetForm.customerName || '-'}</p>



                    <p className="text-sm text-gray-500">Vehículo</p>



                    <p className="text-sm font-semibold text-gray-900">



                      {[budgetForm.patente, budgetForm.vehicle].filter(Boolean).join(' - ') || '-'}



                    </p>



                  </div>



                  <div className="mt-6 border-t border-gray-200 pt-4">



                    <p className="text-sm text-gray-500">Total estimado</p>



                    <p className="mt-1 text-3xl font-bold text-gray-900">${budgetTotal.toLocaleString('es-CL')}</p>



                  </div>



                  <button



                    type="button"



                    onClick={handleClearBudget}



                    className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



                  >



                    Limpiar presupuesto



                  </button>



                </div>



              </div>



              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">



                <div className="border-b border-gray-200 p-6">



                  <h3 className="text-lg font-semibold text-gray-900">Servicios presupuestados</h3>



                </div>



                {budgetItems.length === 0 ? (



                  <div className="p-6 text-sm text-gray-500">No hay servicios agregados.</div>



                ) : (



                  <div className="divide-y divide-gray-200">



                    {budgetItems.map((item) => (



                      <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">



                        <div>



                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>



                          <p className="text-sm text-gray-500">${item.price.toLocaleString('es-CL')}</p>



                        </div>



                        <button



                          type="button"



                          onClick={() => handleRemoveBudgetService(item.id)}



                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-auto"



                        >



                          <Trash2 className="h-4 w-4" />



                          Quitar



                        </button>



                      </div>



                    ))}



                  </div>



                )}



              </div>



            </div>



          )}



          {activeSection === 'reportes' && (



            <>



              {loading ? (



                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">



                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>



                  <p className="text-gray-500 mt-4">Cargando vehí­culos...</p>



                </div>



              ) : (



                <VehicleTable



                  vehicles={vehicles}



                  title="Reporte de vehí­culos"



                  showEdit={false}



                  showDelete={false}



                  onNotify={handleNotify}



                  onExportPdf={exportVehiclePdf}



                />



              )}



            </>



          )}







          {activeSection === 'configuracion' && (



            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">

              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mantenedor de usuarios</h3>
                <p className="text-sm text-gray-500">
                  Crea usuarios y asigna perfiles de acceso por rol.
                </p>
              </div>

              <form onSubmit={handleUserSubmit} className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 lg:grid-cols-4">
                <div>
                  <label htmlFor="user-name" className="mb-2 block text-sm font-medium text-gray-700">
                    Nombre
                  </label>
                  <input
                    id="user-name"
                    name="name"
                    type="text"
                    value={userForm.name}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Nombre del usuario"
                  />
                </div>

                <div>
                  <label htmlFor="user-email" className="mb-2 block text-sm font-medium text-gray-700">
                    Correo
                  </label>
                  <input
                    id="user-email"
                    name="email"
                    type="email"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="usuario@taller.cl"
                  />
                </div>

                <div>
                  <label htmlFor="user-role" className="mb-2 block text-sm font-medium text-gray-700">
                    Perfil
                  </label>
                  <select
                    id="user-role"
                    name="role"
                    value={userForm.role}
                    onChange={handleUserFormChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.keys(roleModules).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                    Crear usuario
                  </button>
                </div>
              </form>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuario</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Perfil</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Accesos</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {workshopUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{user.role}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {roleModules[user.role].join(', ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>



              <div>



                <h3 className="text-lg font-semibold text-gray-900">Apariencia</h3>



                <p className="text-sm text-gray-500">



                  Personaliza el color principal de la interfaz.



                </p>



              </div>



              <div className="flex flex-col gap-4 md:flex-row md:items-center">



                <div className="flex items-center gap-3">



                  <input



                    type="color"



                    value={accentColor}



                    onChange={(event) => setAccentColor(event.target.value)}



                    className="h-10 w-14 rounded border border-gray-300"



                  />



                  <div>



                    <p className="text-sm font-semibold text-gray-900">Color principal</p>



                    <p className="text-xs text-gray-500">{accentColor}</p>



                  </div>



                </div>



                <button



                  type="button"



                  onClick={() => setAccentColor('#1f3a5f')}



                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



                >



                  Restaurar color



                </button>



              </div>



              <div className="rounded-lg border border-gray-200 p-4">



                <p className="text-sm text-gray-500">Vista previa</p>



                <div className="mt-3 flex gap-3">



                  <button className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">



                    Botón principal



                  </button>



                  <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">



                    Botón secundario



                  </button>



                </div>



              </div>



            </div>



          )}



        </main>



      </div>



    </div>



  );



}







export default App;






