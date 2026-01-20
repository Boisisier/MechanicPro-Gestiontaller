import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';



import {



  acceptInvitation,



  adminCreateCompany,



  adminCreateInvitation,



  adminGetCompanies,



  adminGetSupportSessions,



  adminImpersonate,



  clearAuthToken,



  createVehicle,



  deleteVehicle,



  getAuthToken,



  getSession,



  getVehicles,



  login,



  loginOwner,



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



import { CheckCircle, AlertCircle } from 'lucide-react';







interface Notification {



  type: 'success' | 'error';



  message: string;



}







const uuidRegex =



  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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








const serviceCatalog = [



  'Cambio de aceite y filtros',



  'Diagnóstico general',



  'Frenos',



  'Suspensión',



  'Alineación y balanceo',



  'Sistema el?ctrico',



  'Refrigeraci?n',



  'Transmisi?n',



  'Embrague',



  'Neumáticos',



  'Escape',



  'Aire acondicionado',



];







function App() {



  const isOwnerRoute = window.location.pathname.startsWith('/owner');



  const [theme, setTheme] = useState<'light' | 'dark'>(() =>



    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'



  );



  const [accentColor, setAccentColor] = useState(() =>



    localStorage.getItem('accentColor') || '#1f3a5f'



  );



  const [activeSection, setActiveSection] = useState('vehiculos');



  const [vehicles, setVehicles] = useState<Vehicle[]>([]);



  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);



  const [notification, setNotification] = useState<Notification | null>(null);



  const [loading, setLoading] = useState(true);



  const [sidebarOpen, setSidebarOpen] = useState(false);



  const [authToken, setAuthTokenState] = useState<string | null>(() => getAuthToken());



  const [sessionRole, setSessionRole] = useState<'owner' | 'member' | null>(null);



  const [authError, setAuthError] = useState<string | null>(null);



  const [loginForm, setLoginForm] = useState({



    email: '',



    password: '',



    companyId: '',



  });



  const [loginLoading, setLoginLoading] = useState(false);



  const [inviteForm, setInviteForm] = useState({



    token: '',



    fullName: '',



    password: '',



  });



  const [inviteLoading, setInviteLoading] = useState(false);



  const [ownerForm, setOwnerForm] = useState({



    email: '',



    password: '',



  });



  const [ownerLoading, setOwnerLoading] = useState(false);



  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);



  const [adminCompanyName, setAdminCompanyName] = useState('');



  const [adminInvite, setAdminInvite] = useState({



    companyId: '',



    email: '',



    role: 'admin',



  });



  const [adminLoading, setAdminLoading] = useState(false);



  const [adminInviteResult, setAdminInviteResult] = useState<string | null>(null);



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



  const [supportSessions, setSupportSessions] = useState<



    Array<{



      id: string;



      company_id: string;



      company_name: string;



      owner_email: string;



      created_at: string;



      expires_at: string;



      ended_at: string | null;



    }>



  >([]);



  const [supportMode, setSupportMode] = useState(false);



  const [vehicleTab, setVehicleTab] = useState<'ingreso' | 'revision' | 'salida'>('ingreso');



  const [reviewVehicleId, setReviewVehicleId] = useState<string | null>(null);



  const [reviewServices, setReviewServices] = useState<string[]>([]);



  const [reviewNotes, setReviewNotes] = useState('');



  const [readyVehicleIds, setReadyVehicleIds] = useState<string[]>([]);



  const [hiddenSalidaIds, setHiddenSalidaIds] = useState<string[]>([]);







  useEffect(() => {



    if (!authToken) {



      setSessionRole(null);



      return;



    }







    const loadSession = async () => {



      try {



        const session = await getSession();



        if (session.role === 'owner') {



          setSessionRole('owner');



        } else {



          setSessionRole('member');



        }



        setSupportMode(!!session.support);



      } catch (error) {



        clearAuthToken();



        setAuthTokenState(null);



        setSessionRole(null);



        setSupportMode(false);



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



        showNotification('error', 'Error al cargar los vehículos');



        console.error('Error:', error);



      } finally {



        setLoading(false);



      }



    };







    setLoading(true);



    load();



  }, [authToken, sessionRole]);







  useEffect(() => {



    const params = new URLSearchParams(window.location.search);



    const token = params.get('invite');



    if (token) {



      setInviteForm((prev) => ({ ...prev, token }));



    }



  }, []);







  useEffect(() => {



    const params = new URLSearchParams(window.location.search);



    const supportToken = params.get('support');



    if (supportToken) {



      setAuthToken(supportToken);



      setAuthTokenState(supportToken);



      params.delete('support');



      const cleanUrl =



        window.location.pathname + (params.toString() ? `?${params.toString()}` : '');



      window.history.replaceState({}, '', cleanUrl);



    }



  }, []);







  useEffect(() => {



    if (authToken && sessionRole === 'owner') {



      loadCompanies();



    }



  }, [authToken, sessionRole]);







  useEffect(() => {



    if (reviewVehicleId && !vehicles.find((item) => item.id === reviewVehicleId)) {



      setReviewVehicleId(null);



      setReviewServices([]);



      setReviewNotes('');



    }



  }, [vehicles, reviewVehicleId]);







  const showNotification = (type: 'success' | 'error', message: string) => {



    setNotification({ type, message });



    setTimeout(() => setNotification(null), 4000);



  };







  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {



    const { name, value } = event.target;



    setLoginForm((prev) => ({ ...prev, [name]: value }));



  };







  const handleInviteChange = (event: ChangeEvent<HTMLInputElement>) => {



    const { name, value } = event.target;



    setInviteForm((prev) => ({ ...prev, [name]: value }));



  };







  const handleOwnerChange = (event: ChangeEvent<HTMLInputElement>) => {



    const { name, value } = event.target;



    setOwnerForm((prev) => ({ ...prev, [name]: value }));



  };







  const handleLogin = async (event: FormEvent) => {



    event.preventDefault();



    setAuthError(null);



    setLoginLoading(true);







    const companyId = loginForm.companyId.trim();



    if (!uuidRegex.test(companyId)) {



      setAuthError('El Company ID no tiene formato valido');



      setLoginLoading(false);



      return;



    }







    try {



      const session = await login({



        email: loginForm.email.trim(),



        password: loginForm.password,



        company_id: companyId,



      });



      setAuthToken(session.token);



      setAuthTokenState(session.token);



      setSessionRole('member');



      showNotification('success', 'Sesión iniciada correctamente');



    } catch (error) {



      console.error('Login failed', error);



      setAuthError('No se pudo iniciar Sesión');



    } finally {



      setLoginLoading(false);



    }



  };







  const handleAcceptInvite = async (event: FormEvent) => {



    event.preventDefault();



    setAuthError(null);



    setInviteLoading(true);







    try {



      const session = await acceptInvitation({



        token: inviteForm.token.trim(),



        full_name: inviteForm.fullName.trim(),



        password: inviteForm.password,



      });



      setAuthToken(session.token);



      setAuthTokenState(session.token);



      setSessionRole('member');



      showNotification('success', 'Invitación aceptada correctamente');



    } catch (error) {



      console.error('Invite accept failed', error);



      setAuthError('No se pudo aceptar la Invitación');



    } finally {



      setInviteLoading(false);



    }



  };







  const handleOwnerLogin = async (event: FormEvent) => {



    event.preventDefault();



    setAuthError(null);



    setOwnerLoading(true);







    try {



      const session = await loginOwner({



        email: ownerForm.email.trim(),



        password: ownerForm.password,



      });



      setAuthToken(session.token);



      setAuthTokenState(session.token);



      setSessionRole('owner');



      showNotification('success', 'Sesión de owner iniciada');



    } catch (error) {



      console.error('Owner login failed', error);



      setAuthError('No se pudo iniciar Sesión como owner');



    } finally {



      setOwnerLoading(false);



    }



  };







  const handleLogout = () => {



    clearAuthToken();



    setAuthTokenState(null);



    setSessionRole(null);



    setSupportMode(false);



  };







  const loadCompanies = async () => {



    try {



      const data = await adminGetCompanies();



      setCompanies(data);



      if (!adminInvite.companyId && data.length > 0) {



        setAdminInvite((prev) => ({ ...prev, companyId: data[0].id }));



      }



      const sessions = await adminGetSupportSessions();



      setSupportSessions(sessions);



    } catch (error) {



      console.error('Load companies failed', error);



      showNotification('error', 'No se pudo cargar las empresas');



    }



  };







  const handleAdminCreateCompany = async (event: FormEvent) => {



    event.preventDefault();



    if (!adminCompanyName.trim()) {



      return;



    }



    setAdminLoading(true);



    try {



      await adminCreateCompany(adminCompanyName.trim());



      setAdminCompanyName('');



      await loadCompanies();



      showNotification('success', 'Empresa creada');



    } catch (error) {



      console.error('Admin create company failed', error);



      showNotification('error', 'No se pudo crear la empresa');



    } finally {



      setAdminLoading(false);



    }



  };







  const handleAdminInviteChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {



    const { name, value } = event.target;



    setAdminInvite((prev) => ({ ...prev, [name]: value }));



  };







  const handleAdminCreateInvite = async (event: FormEvent) => {



    event.preventDefault();



    setAdminLoading(true);



    setAdminInviteResult(null);



    try {



      const result = await adminCreateInvitation({



        company_id: adminInvite.companyId,



        email: adminInvite.email.trim(),



        role: adminInvite.role,



      });



      setAdminInviteResult(result.invite_url);



      showNotification('success', 'Invitación creada');



    } catch (error) {



      console.error('Admin invite failed', error);



      showNotification('error', 'No se pudo crear la Invitación');



    } finally {



      setAdminLoading(false);



    }



  };







  const handleInventoryChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {



    const { name, value } = event.target;



    setInventoryForm((prev) => ({



      ...prev,



      [name]:



        name === 'stock' || name === 'minStock' || name === 'cost'



          ? parseInt(value) || 0



          : value,



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



        item.id === inventoryAdjust.itemId



          ? {



              ...item,



              stock: item.stock + delta,



              updated_at: new Date().toISOString(),



            }



          : item



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







  const handleImpersonate = async (companyId: string) => {



    try {



      const result = await adminImpersonate(companyId);



      const url = `${window.location.origin}/?support=${result.token}`;



      window.open(url, '_blank');



      showNotification('success', 'Sesión de soporte abierta');



      const sessions = await adminGetSupportSessions();



      setSupportSessions(sessions);



    } catch (error) {



      console.error('Impersonate failed', error);



      showNotification('error', 'No se pudo iniciar soporte');



    }



  };







  const buildVehiclePayload = (vehicle: Vehicle, overrides: Partial<Vehicle>) => ({



    patente: vehicle.patente,



    marca: vehicle.marca,



    modelo: vehicle.modelo,



    ano: vehicle.ano,



    tipo_vehiculo: vehicle.tipo_vehiculo,



    kilometraje: vehicle.kilometraje,



    cantidad_combustible: vehicle.cantidad_combustible,



    estado: vehicle.estado,



    customer_name: vehicle.customer_name || '',



    customer_rut: vehicle.customer_rut || '',



    customer_phone: vehicle.customer_phone || '',



    customer_address: vehicle.customer_address || '',



    customer_city: vehicle.customer_city || '',



    servicios: vehicle.servicios || [],



    observaciones: vehicle.observaciones || '',



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



    setReviewServices(vehicle.servicios || []);



    setReviewNotes(vehicle.observaciones || '');



  };







  const toggleReviewService = (service: string) => {



    setReviewServices((prev) =>



      prev.includes(service) ? prev.filter((item) => item !== service) : [...prev, service]



    );



  };







  const handleSaveReview = async (statusOverride?: Vehicle['estado']) => {



    const vehicle = vehicles.find((item) => item.id === reviewVehicleId);



    if (!vehicle) {



      showNotification('error', 'Selecciona un vehículo para actualizar');



      return;



    }



    try {



      await updateVehicleRecord(



        vehicle,



        {



          estado: statusOverride || vehicle.estado,



          servicios: reviewServices,



          observaciones: reviewNotes,



        },



        statusOverride ? 'vehículo enviado a salida' : 'Servicios guardados'



      );



      if (statusOverride === 'Entregado') {



        setVehicleTab('salida');



      }



    } catch (error) {



      console.error('Review update failed', error);



      showNotification('error', 'No se pudo actualizar el vehículo');



    }



  };







  const handleSendToRevision = async (vehicle: Vehicle) => {



    try {



      await updateVehicleRecord(vehicle, { estado: 'En revision' }, 'vehículo enviado a revisión');



      setVehicleTab('revision');



      setReviewVehicleId(vehicle.id);



      setReviewServices(vehicle.servicios || []);



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







    const services = vehicle.servicios && vehicle.servicios.length > 0 ? vehicle.servicios : [];



    const html = `



      <html>



        <head>



          <title>Salida de vehículo</title>



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



          <h1>Reporte de salida de vehículo</h1>



<p class="muted">Fecha ingreso: ${escapeHtml(ingreso)}</p>



<h2>Cliente</h2>



<p><strong>Nombre:</strong> ${escapeHtml(vehicle.customer_name || '-')}</p>



<p><strong>RUT:</strong> ${escapeHtml(vehicle.customer_rut || '-')}</p>



<p><strong>Teléfono:</strong> ${escapeHtml(vehicle.customer_phone || '-')}</p>



<p><strong>Dirección:</strong> ${escapeHtml(vehicle.customer_address || '-')}</p>



<p><strong>Ciudad:</strong> ${escapeHtml(vehicle.customer_city || '-')}</p>



<h2>vehículo</h2>



<table>



  <tbody>



    <tr><th>Patente</th><td>${escapeHtml(vehicle.patente)}</td></tr>



    <tr><th>Marca</th><td>${escapeHtml(vehicle.marca)}</td></tr>



    <tr><th>Modelo</th><td>${escapeHtml(vehicle.modelo)}</td></tr>



    <tr><th>Año</th><td>${vehicle.ano}</td></tr>



                              {vehicle.tipo_vehiculo} · {vehicle.ano}



    <tr><th>Kilometraje</th><td>${vehicle.kilometraje}</td></tr>



    <tr><th>Combustible</th><td>${vehicle.cantidad_combustible}%</td></tr>



    <tr><th>Estado</th><td>${escapeHtml(vehicle.estado)}</td></tr>



  </tbody>



</table>



<h2>Servicios realizados</h2>



${



  services.length === 0



    ? '<p class="muted">Sin servicios registrados.</p>'



    : `<ul>${services.map((service) => `<li>${escapeHtml(service)}</li>`).join('')}</ul>`



}



<h2>Detalle del trabajo</h2>



<p>${escapeHtml(vehicle.observaciones || 'Sin observaciones')}</p>



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



      showNotification('success', `vehículo ${vehicle.patente} listo`);



    }, 400);



  };







  const handleNotify = (vehicle: Vehicle) => {



    const contact = vehicle.customer_phone || 'cliente';



    showNotification('success', `Aviso enviado a ${contact}`);



  };







  const handleSubmit = async (formData: VehicleFormData) => {



    try {



      if (editingVehicle) {



        const updated = await updateVehicle(editingvehicle.id, formData);



        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));



        showNotification('success', 'vehículo actualizado correctamente');



        setEditingVehicle(null);



      } else {



        const created = await createVehicle(formData);



        setVehicles((prev) => [created, ...prev]);



        showNotification('success', 'vehículo registrado correctamente');



      }



    } catch (error) {



      const message =



        (error as Error & { status?: number }).status === 409



          ? 'La patente ya está registrada'



          : 'Error al guardar el vehículo';



      showNotification('error', message);



      console.error('Error:', error);



    }



  };







  const handleEdit = (vehicle: Vehicle) => {



    setEditingVehicle(vehicle);



    window.scrollTo({ top: 0, behavior: 'smooth' });



  };







  const handleDelete = async (id: string) => {



    try {



      await deleteVehicle(id);



      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));



      showNotification('success', 'vehículo eliminado correctamente');



    } catch (error) {



      showNotification('error', 'Error al eliminar el vehículo');



      console.error('Error:', error);



    }



  };







  const metrics = {



    total: vehicles.length,



    enTaller: vehicles.filter((v) => v.estado === 'En taller').length,



    entregados: vehicles.filter((v) => v.estado === 'Entregado').length,



    enRevision: vehicles.filter((v) => v.estado === 'En revision').length,



  };



  const vehiclesEnTaller = vehicles.filter((vehicle) => vehicle.estado === 'En taller');



  const vehiclesEnRevision = vehicles.filter((vehicle) => vehicle.estado === 'En revision');



  const vehiclesEntregados = vehicles.filter((vehicle) => vehicle.estado === 'Entregado');



  const lowStockItems = inventoryItems.filter(



    (item) => item.minStock > 0 && item.stock <= item.minStock



  );



  const notifications = [



    supportMode



      ? {



          id: 'support',



          title: 'Modo soporte activo',



          body: 'Estas en solo lectura dentro de la cuenta del cliente.',



          time: 'Ahora',



        }



      : null,



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







  if (!authToken && isOwnerRoute) {



    return (



      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">



        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">



          <h1 className="text-2xl font-bold text-gray-900">Acceso owner</h1>



          <p className="text-sm text-gray-500 mt-2">



            Ingresa con tus credenciales de owner para administrar empresas.



          </p>







          {authError && (



            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">



              {authError}



            </div>



          )}







          <form className="mt-6 space-y-4" onSubmit={handleOwnerLogin}>



            <div className="grid grid-cols-1 gap-4">



              <div>



                <label className="text-sm font-medium text-gray-700">Email owner</label>



                <input



                  type="email"



                  name="email"



                  value={ownerForm.email}



                  onChange={handleOwnerChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="owner@local"



                  required



                />



              </div>



              <div>



                <label className="text-sm font-medium text-gray-700">Password</label>



                <input



                  type="password"



                  name="password"



                  value={ownerForm.password}



                  onChange={handleOwnerChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="Password owner"



                  required



                />



              </div>



            </div>



            <button



              type="submit"



              disabled={ownerLoading}



              className="w-full rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"



            >



              {ownerLoading ? 'Ingresando...' : 'Ingresar como owner'}



            </button>



          </form>



        </div>



      </div>



    );



  }







  if (!authToken) {



    return (



      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">



        <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">



          <h1 className="text-2xl font-bold text-gray-900">Acceso al sistema</h1>



          <p className="text-sm text-gray-500 mt-2">



            Ingresa con tu cuenta o acepta una Invitación para activar tu usuario.



          </p>







          {authError && (



            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">



              {authError}



            </div>



          )}







          <form className="mt-6 space-y-4" onSubmit={handleLogin}>



            <h2 className="text-sm font-medium text-gray-700">Ingresar</h2>



            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">



              <div>



                <label className="text-sm font-medium text-gray-700">Email</label>



                <input



                  type="email"



                  name="email"



                  value={loginForm.email}



                  onChange={handleLoginChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="correo@empresa.com"



                  required



                />



              </div>



              <div>



                <label className="text-sm font-medium text-gray-700">Password</label>



                <input



                  type="password"



                  name="password"



                  value={loginForm.password}



                  onChange={handleLoginChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="Tu password"



                  required



                />



              </div>



              <div className="md:col-span-2">



                <label className="text-sm font-medium text-gray-700">Company ID</label>



                <input



                  name="companyId"



                  value={loginForm.companyId}



                  onChange={handleLoginChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="UUID de la empresa"



                  required



                />



              </div>



            </div>



            <button



              type="submit"



              disabled={loginLoading}



              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"



            >



              {loginLoading ? 'Ingresando...' : 'Ingresar'}



            </button>



          </form>







          <div className="my-6 border-t border-gray-200" />







          <form className="space-y-4" onSubmit={handleAcceptInvite}>



            <h2 className="text-sm font-medium text-gray-700">Aceptar Invitación</h2>



            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">



              <div className="md:col-span-2">



                <label className="text-sm font-medium text-gray-700">Token de Invitación</label>



                <input



                  name="token"



                  value={inviteForm.token}



                  onChange={handleInviteChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="Token"



                  required



                />



              </div>



              <div>



                <label className="text-sm font-medium text-gray-700">Nombre completo</label>



                <input



                  name="fullName"



                  value={inviteForm.fullName}



                  onChange={handleInviteChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="Tu nombre"



                  required



                />



              </div>



              <div>



                <label className="text-sm font-medium text-gray-700">Password</label>



                <input



                  type="password"



                  name="password"



                  value={inviteForm.password}



                  onChange={handleInviteChange}



                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                  placeholder="mínimo 8 caracteres"



                  minLength={8}



                  required



                />



              </div>



            </div>



            <button



              type="submit"



              disabled={inviteLoading}



              className="w-full rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"



            >



              {inviteLoading ? 'Activando...' : 'Aceptar Invitación'}



            </button>



          </form>







          <div className="my-6 border-t border-gray-200" />







          <a



            href="/owner"



            className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"



          >



            Acceso owner



          </a>



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







  if (isOwnerRoute && sessionRole !== 'owner') {



    return (



      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">



        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">



          <h1 className="text-2xl font-bold text-gray-900">Acceso restringido</h1>



          <p className="text-sm text-gray-500 mt-2">



            Este panel es solo para owner.



          </p>



          <button



            onClick={handleLogout}



            className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



          >



            Cerrar Sesión



          </button>



        </div>



      </div>



    );



  }







  if (sessionRole === 'owner' && !isOwnerRoute) {



    return (



      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">



        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">



          <h1 className="text-2xl font-bold text-gray-900">Panel owner separado</h1>



          <p className="text-sm text-gray-500 mt-2">



            Accede al panel owner en /owner.



          </p>



          <div className="mt-6 flex flex-col gap-3 sm:flex-row">



            <a



              href="/owner"



              className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold text-center"



            >



              Ir a /owner



            </a>



            <button



              onClick={handleLogout}



              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



            >



              Cerrar Sesión



            </button>



          </div>



        </div>



      </div>



    );



  }







  if (sessionRole === 'owner' && isOwnerRoute) {



    return (



      <div className="min-h-screen bg-gray-50 px-4 py-10">



        <div className="max-w-4xl mx-auto space-y-6">



          <div className="flex items-center justify-between">



            <div>



              <h1 className="text-2xl font-bold text-gray-900">Panel owner</h1>



              <p className="text-sm text-gray-500">



                Crea empresas y genera invitaciones para clientes.



              </p>



            </div>



            <button



              onClick={handleLogout}



              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"



            >



              Salir



            </button>



          </div>







          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">



            <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear empresa</h2>



            <form onSubmit={handleAdminCreateCompany} className="flex flex-col gap-4 md:flex-row">



              <input



                value={adminCompanyName}



                onChange={(event) => setAdminCompanyName(event.target.value)}



                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                placeholder="Nombre de la empresa"



                required



              />



              <button



                type="submit"



                disabled={adminLoading}



                className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"



              >



                {adminLoading ? 'Creando...' : 'Crear'}



              </button>



            </form>



          </div>







          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">



            <h2 className="text-lg font-semibold text-gray-900 mb-4">Empresas</h2>



            {companies.length === 0 ? (



              <p className="text-sm text-gray-500">No hay empresas registradas.</p>



            ) : (



              <div className="space-y-3">



                {companies.map((company) => (



                  <div



                    key={company.id}



                    className="flex flex-col gap-1 rounded-lg border border-gray-200 px-4 py-3"



                  >



                    <span className="text-sm font-semibold text-gray-900">{company.name}</span>



                    <span className="text-xs text-gray-500">{company.id}</span>



                    <button



                      onClick={() => handleImpersonate(company.id)}



                      className="mt-2 w-fit rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"



                    >



                      Entrar como cliente



                    </button>



                  </div>



                ))}



              </div>



            )}



          </div>







          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">



            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invitar usuarios</h2>



            <form onSubmit={handleAdminCreateInvite} className="space-y-4">



              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">



                <div>



                  <label className="text-sm font-medium text-gray-700">Empresa</label>



                  <select



                    name="companyId"



                    value={adminInvite.companyId}



                    onChange={handleAdminInviteChange}



                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                    required



                  >



                    <option value="" disabled>



                      Selecciona una empresa



                    </option>



                    {companies.map((company) => (



                      <option key={company.id} value={company.id}>



                        {company.name}



                      </option>



                    ))}



                  </select>



                </div>



                <div>



                  <label className="text-sm font-medium text-gray-700">Email</label>



                  <input



                    name="email"



                    value={adminInvite.email}



                    onChange={handleAdminInviteChange}



                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                    placeholder="cliente@empresa.com"



                    required



                  />



                </div>



                <div>



                  <label className="text-sm font-medium text-gray-700">Rol</label>



                  <select



                    name="role"



                    value={adminInvite.role}



                    onChange={handleAdminInviteChange}



                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"



                    required



                  >



                    <option value="admin">Admin</option>



                    <option value="mecanico">Mecanico</option>



                    <option value="recepcionista">Recepcionista</option>



                  </select>



                </div>



              </div>



              <button



                type="submit"



                disabled={adminLoading}



                className="w-full rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"



              >



                {adminLoading ? 'Generando...' : 'Generar Invitación'}



              </button>



            </form>







            {adminInviteResult && (



              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">



                Link de Invitación:



                <div className="mt-2 break-all text-xs">{adminInviteResult}</div>



              </div>



            )}



          </div>







          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">



            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sesiones de soporte</h2>



            {supportSessions.length === 0 ? (



              <p className="text-sm text-gray-500">No hay sesiones recientes.</p>



            ) : (



              <div className="space-y-3">



                {supportSessions.map((session) => (



                  <div



                    key={session.id}



                    className="rounded-lg border border-gray-200 px-4 py-3 text-sm"



                  >



                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">



                      <div>



                        <p className="font-semibold text-gray-900">{session.company_name}</p>



                        <p className="text-xs text-gray-500">{session.company_id}</p>



                      </div>



                      <div className="text-xs text-gray-500">



                        {new Date(session.created_at).toLocaleString('es-ES')}



                      </div>



                    </div>



                    <p className="text-xs text-gray-500 mt-2">



                      Owner: {session.owner_email} · Expira:{' '}



                      {new Date(session.expires_at).toLocaleString('es-ES')}



                    </p>



                  </div>



                ))}



              </div>



            )}



          </div>



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



              className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${



                notification.type === 'success'



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







        {supportMode && (



          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 text-sm text-yellow-800">



            Modo soporte activo: solo lectura.



          </div>



        )}







        <main className="p-8">



          {activeSection === 'vehiculos' && (



            <>



              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">



                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">



                  {[



                    { id: 'ingreso', label: 'Ingreso de vehículos' },



                    { id: 'revision', label: 'En revisión' },



                    { id: 'salida', label: 'Salida vehículos' },



                  ].map((tab) => (



                    <button



                      key={tab.id}



                      onClick={() => setVehicleTab(tab.id as typeof vehicleTab)}



                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${



                        vehicleTab === tab.id



                          ? 'btn-primary'



                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'



                      }`}



                    >



                      {tab.label}



                    </button>



                  ))}



                </div>



              </div>







              {vehicleTab === 'ingreso' && (



                <>



                  <div className="mb-8">



                    <VehicleForm



                      onSubmit={handleSubmit}



                      editingVehicle={editingVehicle}



                      onCancelEdit={() => setEditingVehicle(null)}



                    />



                  </div>







                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">



                    <h3 className="text-lg font-semibold text-gray-900 mb-4">vehículos en taller</h3>



                    {vehiclesEnTaller.length === 0 ? (



                      <p className="text-sm text-gray-500">No hay vehículos en taller.</p>



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



                                {vehicle.marca} {vehicle.modelo} · {vehicle.customer_name || 'Sin cliente'}



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



                    {vehiclesEnRevision.length === 0 ? (



                      <p className="text-sm text-gray-500">No hay vehículos en revisión.</p>



                    ) : (



                      <div className="space-y-3">



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



                              {vehicle.marca} {vehicle.modelo} · {vehicle.customer_name || 'Sin cliente'}



                            </p>



                          </button>



                        ))}



                      </div>



                    )}



                  </div>







                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">



                    {reviewVehicleId ? (



                      <>



                        <div className="mb-4">



                          <h3 className="text-lg font-semibold text-gray-900">Servicios realizados</h3>



                          <p className="text-sm text-gray-500">



                            Selecciona los trabajos ejecutados y agrega el detalle final.



                          </p>



                        </div>







                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">



                          {serviceCatalog.map((service) => (



                            <label



                              key={service}



                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${



                                reviewServices.includes(service)



                                  ? 'border-blue-500 bg-blue-50'



                                  : 'border-gray-200'



                              }`}



                            >



                              <input



                                type="checkbox"



                                checked={reviewServices.includes(service)}



                                onChange={() => toggleReviewService(service)}



                              />



                              {service}



                            </label>



                          ))}



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



                            Guardar servicios



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



                      <p className="text-sm text-gray-500">Selecciona un vehículo para registrar servicios.</p>



                    )}



                  </div>



                </div>



              )}







              {vehicleTab === 'salida' && (



                <div className="space-y-4">



                  {vehiclesEntregados.filter((vehicle) => !hiddenSalidaIds.includes(vehicle.id))



                    .length === 0 ? (



                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-sm text-gray-500">



                      No hay vehículos en salida.



                    </div>



                  ) : (



                    vehiclesEntregados



                      .filter((vehicle) => !hiddenSalidaIds.includes(vehicle.id))



                      .map((vehicle) => (



                      <div



                        key={vehicle.id}



                        className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm fade-item ${



                          readyVehicleIds.includes(vehicle.id) ? 'fade-out' : ''



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



                            <p className="text-xs text-gray-500">



                              {vehicle.customer_address || '-'} {vehicle.customer_city || ''}



                            </p>



                          </div>



                          <div className="rounded-lg border border-gray-200 p-4">



                            <p className="text-xs uppercase tracking-wide text-gray-500">vehículo</p>



                            <p className="text-sm text-gray-700">



                              {vehicle.tipo_vehiculo} · {vehicle.ano}



                            </p>



                            <p className="text-xs text-gray-500">



                              KM: {vehicle.kilometraje} · Combustible: {vehicle.cantidad_combustible}%



                            </p>



                            <p className="text-xs text-gray-500">Estado: {vehicle.estado}</p>



                          </div>



                          <div className="rounded-lg border border-gray-200 p-4">



                            <p className="text-xs uppercase tracking-wide text-gray-500">Servicios</p>



                            {vehicle.servicios && vehicle.servicios.length > 0 ? (



                              <ul className="text-xs text-gray-700 list-disc pl-4 mt-2 space-y-1">



                                {vehicle.servicios.map((service) => (



                                  <li key={service}>{service}</li>



                                ))}



                              </ul>



                            ) : (



                              <p className="text-xs text-gray-500 mt-2">Sin servicios registrados.</p>



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



                      placeholder="Categoría (aceites, frenos...)"



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



                      placeholder="Codigo de barras"



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



                      placeholder="Stock mínimo"



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



                              <p className="text-xs text-gray-500">Codigo: {item.barcode || '-'}</p>



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







          {activeSection === 'reportes' && (



            <>



              {loading ? (



                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">



                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>



                  <p className="text-gray-500 mt-4">Cargando vehículos...</p>



                </div>



              ) : (



                <VehicleTable



                  vehicles={vehicles}



                  title="Reporte de vehículos"



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



                    Boton principal



                  </button>



                  <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">



                    Boton secundario



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








