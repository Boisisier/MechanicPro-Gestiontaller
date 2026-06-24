import mechanicProLogo from "../assets/mechanic-pro-logo.png";
import { Vehicle } from "../lib/types";
import { parseStoredReviewParts, parseStoredReviewServices } from "./reviewParsers";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value: number) =>
  `$${Math.max(0, value).toLocaleString("es-CL")}`;

export const exportVehiclePdf = (vehicle: Vehicle) => {
  const ingreso = formatDate(vehicle.fecha_ingreso);
  const salida = formatDate(vehicle.fecha_salida_confirmada);
  const logoUrl = new URL(mechanicProLogo, window.location.origin).href;
  const displayEstado = vehicle.en_estacionamiento_manual
    ? "Estacionamiento"
    : vehicle.estado;

  const serviceItems = parseStoredReviewServices(vehicle.servicios);
  const parts = parseStoredReviewParts(vehicle.servicios);

  const serviceTotal = serviceItems.reduce(
    (sum, service) => sum + (parseInt(service.price || "0", 10) || 0),
    0,
  );
  const partsTotal = parts
    .filter((part) => part.itemType !== "insumo")
    .reduce((sum, part) => sum + part.quantity * (part.unitCost || 0), 0);
  const suppliesTotal = parts
    .filter((part) => part.itemType === "insumo")
    .reduce((sum, part) => sum + part.quantity * (part.unitCost || 0), 0);
  const attentionTotal = serviceTotal + partsTotal + suppliesTotal;
  const customerAdvance = Math.max(0, Number(vehicle.customer_advance) || 0);
  const pendingBalance = Math.max(0, attentionTotal - customerAdvance);
  const advanceCredit = Math.max(0, customerAdvance - attentionTotal);

  const html = `
    <html lang="es">
      <head>
        <title>Salida de vehículo</title>
        <style>
          @page { margin: 18mm; }

          * { box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            color: #111827;
            background: #ffffff;
          }

          .document {
            width: 100%;
          }

          .brand-header {
            display: flex;
            align-items: center;
            gap: 18px;
            padding-bottom: 18px;
            border-bottom: 3px solid #0f4471;
            margin-bottom: 18px;
          }

          .brand-logo {
            width: 86px;
            height: 86px;
            object-fit: contain;
            flex: 0 0 auto;
          }

          h1 {
            font-size: 22px;
            margin: 0 0 6px;
            color: #0f4471;
          }

          h2 {
            font-size: 14px;
            margin: 20px 0 8px;
            color: #0f172a;
          }

          p {
            margin: 0 0 8px;
            font-size: 12px;
            line-height: 1.4;
            color: #111827;
          }

          ul {
            margin: 0;
            padding-left: 20px;
            font-size: 12px;
          }

          li { margin-bottom: 4px; }

          .muted { color: #6b7280; }

          .client-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px 24px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th,
          td {
            border: 1px solid #e5e7eb;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }

          th {
            width: 36%;
            background: #f8fafc;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.04em;
            color: #0f4471;
          }

          .summary {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 12px;
            margin-top: 14px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin: 6px 0;
            font-size: 12px;
          }

          .summary-total {
            border-top: 1px solid #d1d5db;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 700;
            font-size: 15px;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <main class="document">
          <header class="brand-header">
            <img class="brand-logo" src="${logoUrl}" alt="Mechanic Pro" />
            <div>
              <h1>Reporte de salida de vehículo</h1>
              <p class="muted">Fecha de ingreso: ${escapeHtml(ingreso)}</p>
              <p class="muted">Fecha de salida: ${escapeHtml(salida)}</p>
            </div>
          </header>

          <h2>Cliente</h2>
          <section class="client-grid">
            <p><strong>Nombre:</strong> ${escapeHtml(vehicle.customer_name || "-")}</p>
            <p><strong>RUT:</strong> ${escapeHtml(vehicle.customer_rut || "-")}</p>
            <p><strong>Teléfono:</strong> ${escapeHtml(vehicle.customer_phone || "-")}</p>
            <p><strong>Correo:</strong> ${escapeHtml(vehicle.customer_email || "-")}</p>
            <p><strong>Dirección:</strong> ${escapeHtml(vehicle.customer_address || "-")}</p>
            <p><strong>Ciudad:</strong> ${escapeHtml(vehicle.customer_city || "-")}</p>
          </section>

          <h2>Vehículo</h2>
          <table>
            <tbody>
              <tr><th>Patente</th><td>${escapeHtml(vehicle.patente)}</td></tr>
              <tr><th>Marca</th><td>${escapeHtml(vehicle.marca)}</td></tr>
              <tr><th>Modelo</th><td>${escapeHtml(vehicle.modelo)}</td></tr>
              <tr><th>Año</th><td>${vehicle.ano}</td></tr>
              <tr><th>Tipo de vehículo</th><td>${escapeHtml(vehicle.tipo_vehiculo || "-")}</td></tr>
              <tr><th>Kilometraje</th><td>${vehicle.kilometraje.toLocaleString("es-CL")}</td></tr>
              <tr><th>Combustible</th><td>${vehicle.cantidad_combustible}%</td></tr>
              <tr><th>Color de ingreso</th><td>${escapeHtml(vehicle.color || "-")}</td></tr>
              <tr><th>Estado</th><td>${escapeHtml(displayEstado)}</td></tr>
            </tbody>
          </table>

          <h2>Servicios realizados</h2>
          ${
            serviceItems.length === 0
              ? '<p class="muted">Sin servicios registrados.</p>'
              : `<ul>${serviceItems
                  .map((service) => {
                    const price = parseInt(service.price || "0", 10) || 0;
                    const value = price > 0 ? ` (${formatMoney(price)})` : "";
                    return `<li>${escapeHtml(`${service.name}${value}`)}</li>`;
                  })
                  .join("")}</ul>`
          }

          <h2>Repuestos e insumos utilizados</h2>
          ${
            parts.length === 0
              ? '<p class="muted">Sin repuestos ni insumos registrados.</p>'
              : `<ul>${parts
                  .map((part) => {
                    const type = part.itemType === "insumo" ? "Insumo" : "Repuesto";
                    const total = part.quantity * (part.unitCost || 0);
                    return `<li>${escapeHtml(
                      `${type}: ${part.name} x${part.quantity} ${part.unit} - ${formatMoney(total)}`,
                    )}</li>`;
                  })
                  .join("")}</ul>`
          }

          <h2>Resumen de atención</h2>
          <div class="summary">
            <div class="summary-row"><span>Servicios</span><strong>${formatMoney(serviceTotal)}</strong></div>
            <div class="summary-row"><span>Repuestos</span><strong>${formatMoney(partsTotal)}</strong></div>
            <div class="summary-row"><span>Insumos</span><strong>${formatMoney(suppliesTotal)}</strong></div>
            <div class="summary-row"><span>Total de atención</span><strong>${formatMoney(attentionTotal)}</strong></div>
            <div class="summary-row"><span>Abono del cliente</span><strong>-${formatMoney(customerAdvance)}</strong></div>
            <div class="summary-row summary-total"><span>Saldo pendiente</span><strong>${formatMoney(pendingBalance)}</strong></div>
            ${
              advanceCredit > 0
                ? `<div class="summary-row"><span>Saldo a favor</span><strong>${formatMoney(advanceCredit)}</strong></div>`
                : ""
            }
          </div>

          <h2>Detalle del trabajo</h2>
          <p>${escapeHtml(vehicle.observaciones || "Sin observaciones.")}</p>

          <h2>Comentario técnico</h2>
          <p>${escapeHtml(vehicle.comentario_tecnico || "Sin comentario técnico.")}</p>
        </main>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1000,height=700");

  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const printDocument = () => {
    printWindow.focus();
    printWindow.print();
  };

  const logo = printWindow.document.querySelector<HTMLImageElement>(".brand-logo");
  if (logo && !logo.complete) {
    logo.onload = printDocument;
    logo.onerror = printDocument;
    return;
  }

  window.setTimeout(printDocument, 150);
};
