import { Vehicle } from "../lib/types";
import { parseStoredReviewServices, serializeReviewService, parseStoredReviewParts } from "./reviewParsers";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const exportVehiclePdf = (vehicle: Vehicle) => {
  const ingreso = new Date(vehicle.fecha_ingreso).toLocaleDateString("es-ES", {
    day: "2-digit",

    month: "2-digit",

    year: "numeric",
  });

  const services = parseStoredReviewServices(vehicle.servicios).map(
    serializeReviewService,
  );
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
      <html>



        <head>



          <title>Salida de vehículo</title>



          <style>



            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }



            h1 { font-size: 20px; margin-bottom: 8px; }



            h2 { font-size: 14px; margin: 20px 0 8px; }



            p { margin: 0 0 8px; font-size: 12px; color: #111827; }



            .muted { color: #6b7280; }

            .summary { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-top: 14px; }

            .summary-row { display: flex; justify-content: space-between; margin: 6px 0; }

            .summary-total { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px; font-weight: 700; font-size: 16px; }



            table { width: 100%; border-collapse: collapse; font-size: 12px; }



            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }



            th { background: #f9fafb; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }



          </style>



        </head>



        <body>



          <h1>Reporte de salida de vehículo</h1>



<p class="muted">Fecha ingreso: ${escapeHtml(ingreso)}</p>



<h2>Cliente</h2>



<p><strong>Nombre:</strong> ${escapeHtml(vehicle.customer_name || "-")}</p>



<p><strong>RUT:</strong> ${escapeHtml(vehicle.customer_rut || "-")}</p>



<p><strong>Telí©fono:</strong> ${escapeHtml(vehicle.customer_phone || "-")}</p>



<p><strong>Dirección:</strong> ${escapeHtml(vehicle.customer_address || "-")}</p>



<p><strong>Correo:</strong> ${escapeHtml(vehicle.customer_city || "-")}</p>



<h2>vehículo</h2>



<table>



  <tbody>



    <tr><th>Patente</th><td>${escapeHtml(vehicle.patente)}</td></tr>



    <tr><th>Marca</th><td>${escapeHtml(vehicle.marca)}</td></tr>



    <tr><th>Modelo</th><td>${escapeHtml(vehicle.modelo)}</td></tr>



    <tr><th>Año</th><td>${vehicle.ano}</td></tr>



                              {vehicle.tipo_vehiculo} Â· {vehicle.ano}



    <tr><th>Kilometraje</th><td>${vehicle.kilometraje}</td></tr>



    <tr><th>Combustible</th><td>${vehicle.cantidad_combustible}%</td></tr>



    <tr><th>Color ingreso</th><td>${escapeHtml(vehicle.color || "-")}</td></tr>



    <tr><th>Estado</th><td>${escapeHtml(vehicle.estado)}</td></tr>



  </tbody>



</table>



<h2>Servicios realizados</h2>



${
  services.length === 0
    ? '<p class="muted">Sin servicios registrados.</p>'
    : `<ul>${services.map((service) => `<li>${escapeHtml(service)}</li>`).join("")}</ul>`
}



<h2>Repuestos utilizados</h2>

${
  parts.length === 0
    ? '<p class="muted">Sin repuestos ni insumos registrados.</p>'
    : `<ul>${parts.map((part) => `<li>${escapeHtml(`${part.itemType === "insumo" ? "Insumo" : "Repuesto"}: ${part.name} x${part.quantity} ${part.unit} - $${(part.quantity * (part.unitCost || 0)).toLocaleString("es-CL")}`)}</li>`).join("")}</ul>`
}

<h2>Resumen de atencion</h2>

<div class="summary">
  <div class="summary-row"><span>Servicios</span><strong>$${serviceTotal.toLocaleString("es-CL")}</strong></div>
  <div class="summary-row"><span>Repuestos</span><strong>$${partsTotal.toLocaleString("es-CL")}</strong></div>
  <div class="summary-row"><span>Insumos</span><strong>$${suppliesTotal.toLocaleString("es-CL")}</strong></div>
  <div class="summary-row"><span>Total atencion</span><strong>$${attentionTotal.toLocaleString("es-CL")}</strong></div>
  <div class="summary-row"><span>Abono cliente</span><strong>-$${customerAdvance.toLocaleString("es-CL")}</strong></div>
  <div class="summary-row summary-total"><span>Saldo pendiente</span><strong>$${pendingBalance.toLocaleString("es-CL")}</strong></div>
  ${advanceCredit > 0 ? `<div class="summary-row"><span>Saldo a favor</span><strong>$${advanceCredit.toLocaleString("es-CL")}</strong></div>` : ""}
</div>



<h2>Detalle del trabajo</h2>



<p>${escapeHtml(vehicle.observaciones || "Sin observaciones")}</p>

<h2>Comentario tecnico</h2>

<p>${escapeHtml(vehicle.comentario_tecnico || "Sin comentario tecnico")}</p>



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

  printWindow.focus();

  printWindow.print();
};
