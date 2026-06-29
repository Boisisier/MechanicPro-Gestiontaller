import VehicleForm from "./components/VehicleForm";
import VehiculoHeader from "./components/VehiculoHeader";
import useVehiculo from "./hooks/useVehiculo";

interface VehiculoPageProps {
  isMechanicSession: Boolean;
  canAccessSalida: Boolean;
  isSessionAdmin : boolean;
}

export default function VehiculoPage({
  isMechanicSession,
  canAccessSalida,
  isSessionAdmin
}: VehiculoPageProps) {
  const {
    vehicleTab,
    setVehicleTab,
    requestConfirmation,
    handleClearReviewRecord,
    handleSubmit,
    editingVehicle,
    setEditingVehicle,
    vehicles,
    mechanicOptions,
    catalogServices,
    vehiclesEnTaller,
    vehiclesEntaller,
    handleSendToTaller
  } = useVehiculo({ isMechanicSession });
  return (
    <>
      <VehiculoHeader
        canAccessSalida={canAccessSalida}
        handleClearReviewRecord={handleClearReviewRecord}
        isMechanicSession={isMechanicSession}
        requestConfirmation={requestConfirmation}
        setVehicleTab={setVehicleTab}
        vehicleTab={vehicleTab}
      />

      {vehicleTab === "ingreso" && (
        <>
          <div className="mb-8">
            <VehicleForm
              onSubmit={handleSubmit}
              editingVehicle={editingVehicle}
              onCancelEdit={() => setEditingVehicle(null)}
              existingVehicles={vehicles}
              mechanics={mechanicOptions}
              canManageAdvance={isSessionAdmin}
              serviceCatalog={catalogServices.filter(
                (service) => service.active !== false,
              )}
            />
          </div>

          <div className="hidden">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              vehículos en taller
            </h3>

            {vehiclesEnTaller.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay vehículos en taller.
              </p>
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
                        {vehicle.marca} {vehicle.modelo} ·{" "}
                        {vehicle.customer_name || "Sin cliente"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSendToTaller(vehicle)}
                      className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold"
                    >
                      Enviar a En Taller
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* {vehicleTab === "taller" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-bold text-gray-900">
                Vehículos en Taller
              </h3>

              <span className="text-xs text-gray-500">
                {vehiclesEntaller.length} activos
              </span>
            </div>

            {vehiclesEntaller.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay vehículos En Taller.
              </p>
            ) : (
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {vehiclesEntaller.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`rounded-lg border px-4 py-3 transition-colors ${
                      reviewVehicleId === vehicle.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleReviewSelect(vehicle)}
                      className="w-full text-left"
                    >
                      <p className="text-sm font-semibold text-gray-900 uppercase">
                        {vehicle.patente}
                      </p>

                      <p className="text-xs text-gray-500">
                        {vehicle.marca} {vehicle.modelo} ·{" "}
                        {vehicle.customer_name || "Sin cliente"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-800">
                        Mecánico:{" "}
                        {vehicle.assigned_mechanic_name || "Sin asignar"}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        Sigue En Taller hasta pasar a salida
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span>
                          Prioridad:{" "}
                          <strong>
                            {vehicle.attention_priority || "Normal"}
                          </strong>
                        </span>
                        <span>
                          Plan:{" "}
                          <strong>
                            {Number(vehicle.estimated_work_hours) || 0} h
                          </strong>
                        </span>
                        <span>
                          Entrega:{" "}
                          <strong>
                            {formatPromisedDeliveryDate(
                              vehicle.promised_delivery_date,
                            )}
                          </strong>
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-right">
                        <Clock className="h-4 w-4 text-[#0f4471]" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Tiempo de trabajo
                          </p>
                          <p className="text-sm font-bold text-[#0f4471]">
                            {formatVehicleWorkTime(vehicle)}
                          </p>
                        </div>
                      </div>
                      {!isMechanicSession && (
                        <button
                          type="button"
                          onClick={() => handleReturnFromTaller(vehicle)}
                          className="rounded-md border border-[#fc3d3c]/30 px-2.5 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fc3d3c]/10"
                          title="Devolver a ingreso"
                        >
                          Devolver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
            {activeReviewVehicle ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Servicios realizados
                    </h3>

                    <p className="text-sm text-gray-500">
                      Busca procedimientos, agrégalos con valor y guarda el
                      trabajo ejecutado.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setServicePickerOpen((prev) => !prev)}
                      className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                    >
                      {servicePickerOpen
                        ? "Cerrar buscador"
                        : "Buscar servicios"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInventoryPicker("repuesto")}
                      className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                    >
                      {partPickerOpen && inventoryPickerType === "repuesto"
                        ? "Cerrar repuestos"
                        : "Buscar repuestos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInventoryPicker("insumo")}
                      className="rounded-lg bg-[#0f4471] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0b365c]"
                    >
                      {partPickerOpen && inventoryPickerType === "insumo"
                        ? "Cerrar insumos"
                        : "Buscar insumos"}
                    </button>
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
                              No hay servicios disponibles con esa búsqueda.
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
                                    onClick={() =>
                                      handleAddReviewService(service.name)
                                    }
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                                  >
                                    <span>{service.name}</span>
                                    <span className="text-xs font-semibold text-blue-600">
                                      Agregar
                                    </span>
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
                        placeholder={`Buscar ${inventoryPickerType === "insumo" ? "insumo" : "repuesto"} por nombre, SKU, código o ubicación...`}
                      />
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-lg">
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {inventoryPickerType === "insumo"
                            ? "Insumos en inventario"
                            : "Repuestos en inventario"}
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
                            No hay{" "}
                            {inventoryPickerType === "insumo"
                              ? "insumos"
                              : "repuestos"}{" "}
                            disponibles con esa busqueda.
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
                                <span className="block font-semibold text-gray-900">
                                  {item.name}
                                </span>
                                <span
                                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    item.item_type === "insumo"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {item.item_type === "insumo"
                                    ? "Insumo"
                                    : "Repuesto"}
                                </span>
                                <span className="block text-xs text-gray-500">
                                  {item.category} · SKU: {item.sku || "-"} ·
                                  Bodega: {item.location || "-"}
                                </span>
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  item.stock > 0
                                    ? "text-emerald-700"
                                    : "text-[#fc3d3c]"
                                }`}
                              >
                                Stock {item.stock} {item.unit || ""}
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
                      No hay servicios seleccionados todavía.
                    </p>
                  ) : (
                    reviewServices.map((service) => (
                      <div
                        key={service.name}
                        className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_44px]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {service.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            Servicio aplicable a sistemas automotrices.
                          </p>
                        </div>

                        <div className="hidden">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Repuestos e insumos utilizados
                            </h4>
                            <span className="text-xs text-gray-500">
                              {reviewParts.length} seleccionado(s)
                            </span>
                          </div>

                          {reviewParts.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                              No hay repuestos ni insumos seleccionados todavía.
                            </p>
                          ) : (
                            reviewParts.map((part) => {
                              const inventoryItem = inventoryItems.find(
                                (item) => item.id === part.inventoryItemId,
                              );
                              const savedQuantity =
                                parseStoredReviewParts(
                                  activeReviewVehicle.servicios,
                                ).find(
                                  (savedPart) =>
                                    savedPart.inventoryItemId ===
                                    part.inventoryItemId,
                                )?.quantity || 0;
                              const availableQuantity =
                                (inventoryItem?.stock || 0) + savedQuantity;
                              return (
                                <div
                                  key={part.inventoryItemId}
                                  className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[minmax(0,1fr)_140px_44px]"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {part.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      SKU: {part.sku || "-"} · Bodega:{" "}
                                      {part.location || "-"} · Stock disponible:{" "}
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
                                          parseInt(event.target.value) || 1,
                                        )
                                      }
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveReviewPart(
                                          part.inventoryItemId,
                                        )
                                      }
                                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                                      title="Eliminar item"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="flex items-end">
                          {(!isMechanicSession ||
                            !isStoredReviewService(service.name)) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveReviewService(service.name)
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                              title="Eliminar servicio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Repuestos e insumos utilizados
                    </h4>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                      {reviewParts.length} seleccionado(s)
                    </span>
                  </div>

                  {reviewParts.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-500">
                      No hay repuestos ni insumos seleccionados todavía.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviewParts.map((part) => {
                        const inventoryItem = inventoryItems.find(
                          (item) => item.id === part.inventoryItemId,
                        );
                        const savedQuantity =
                          parseStoredReviewParts(
                            activeReviewVehicle.servicios,
                          ).find(
                            (savedPart) =>
                              savedPart.inventoryItemId ===
                              part.inventoryItemId,
                          )?.quantity || 0;
                        const availableQuantity =
                          (inventoryItem?.stock || 0) + savedQuantity;

                        return (
                          <div
                            key={part.inventoryItemId}
                            className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_44px]"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {part.name}
                                </p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    part.itemType === "insumo"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {part.itemType === "insumo"
                                    ? "Insumo"
                                    : "Repuesto"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                SKU: {part.sku || "-"} · Bodega:{" "}
                                {part.location || "-"} · Stock disponible:{" "}
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
                                    parseInt(event.target.value, 10) || 1,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveReviewPart(part.inventoryItemId)
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fc3d3c]/30 text-[#fc3d3c] hover:bg-[#fc3d3c]/10"
                                title="Eliminar item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {canEditPrices && (
                  <div className="mb-6 rounded-xl border border-[#0f4471]/20 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Valores de la atención
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        Completa los valores de servicios, repuestos e insumos
                        antes de finalizar.
                      </p>
                    </div>

                    {reviewServices.length === 0 && reviewParts.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
                        Agrega servicios o items de inventario para completar
                        sus valores.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                        {reviewServices.map((service) => (
                          <div
                            key={`value-service-${service.name}`}
                            className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {service.name}
                              </p>
                              <p className="text-xs text-gray-500">Servicio</p>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Valor
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={service.price}
                                onChange={(event) =>
                                  handleReviewServicePriceChange(
                                    service.name,
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}

                        {reviewParts.map((part) => (
                          <div
                            key={`value-part-${part.inventoryItemId}`}
                            className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {part.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {part.itemType === "insumo"
                                  ? "Insumo"
                                  : "Repuesto"}{" "}
                                · Cantidad {part.quantity}
                              </p>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Valor unitario
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={part.unitCost || ""}
                                onChange={(event) =>
                                  handleReviewPartUnitCostChange(
                                    part.inventoryItemId,
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="0"
                              />
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                Subtotal: $
                                {(
                                  part.quantity * (part.unitCost || 0)
                                ).toLocaleString("es-CL")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  {canEditPrices && (
                    <div className="mb-6 rounded-xl border border-[#0f4471]/20 bg-white p-4 shadow-sm">
                      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Resumen de atención
                          </h4>
                          <p className="text-xs text-gray-500">
                            Total actualizado con servicios, repuestos e insumos
                            seleccionados.
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-[#0f4471]">
                          ${reviewAttentionTotal.toLocaleString("es-CL")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Servicios
                          </p>
                          <p className="mt-1 text-lg font-bold text-gray-900">
                            ${reviewServiceTotal.toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Repuestos
                          </p>
                          <p className="mt-1 text-lg font-bold text-gray-900">
                            ${reviewPartTotal.toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Insumos
                          </p>
                          <p className="mt-1 text-lg font-bold text-gray-900">
                            ${reviewSupplyTotal.toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            Abono cliente
                          </p>
                          <p className="mt-1 text-lg font-bold text-emerald-800">
                            $
                            {(
                              Number(activeReviewVehicle?.customer_advance) || 0
                            ).toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#0f4471]">
                            Saldo pendiente
                          </p>
                          <p className="mt-1 text-lg font-bold text-[#0f4471]">
                            $
                            {Math.max(
                              0,
                              reviewAttentionTotal -
                                (Number(
                                  activeReviewVehicle?.customer_advance,
                                ) || 0),
                            ).toLocaleString("es-CL")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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

                <div className="sticky bottom-4 z-10 mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                  <button
                    onClick={() => handleSaveReview()}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {canEditPrices ? "Guardar selección" : "Guardar trabajo"}
                  </button>

                  {canSendToSalida && (
                    <button
                      onClick={() =>
                        requestConfirmation({
                          title: "Enviar a salida",
                          message:
                            "El vehículo pasará a Salida y se guardarán los servicios y repuestos registrados.",
                          confirmLabel: "Enviar a salida",
                          variant: "info",
                          onConfirm: () => handleSaveReview("Entregado"),
                        })
                      }
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-700 focus:ring-4 focus:ring-green-200"
                    >
                      Enviar a salida
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Envia un vehículo a En Taller para registrar servicios.
              </p>
            )}
          </div>
        </div>
      )} */}

      {/* {vehicleTab === "salida" && (
        <div className="space-y-4">
          {vehiclesEnSalida.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-sm text-gray-500">
              No hay vehículos en salida.
            </div>
          ) : (
            vehiclesEnSalida.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm fade-item ${
                  readyVehicleIds.includes(vehicle.id) ? "fade-out" : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 uppercase">
                      {vehicle.patente}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {vehicle.marca} {vehicle.modelo} ·{" "}
                      {vehicle.customer_name || "Sin cliente"}
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
                      onClick={() => handleReturnToTallerFromSalida(vehicle)}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Devolver a Taller
                    </button>

                    <button
                      onClick={() => handleSendToParking(vehicle)}
                      className="rounded-lg bg-[#fc3d3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#df2f2f]"
                    >
                      Pasar a estacionamiento
                    </button>

                    <button
                      onClick={() => handleVehicleReady(vehicle)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      vehículo listo
                    </button>
                  </div>
                </div>

                {canEditPrices && (
                  <ExitPricingSection
                    vehicle={vehicle}
                    onSave={(services, parts) =>
                      handleSaveExitPricing(vehicle, services, parts)
                    }
                  />
                )}

                {isSessionAdmin && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Total atención
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        ${getVehicleWorkTotal(vehicle).toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Abono cliente
                      </p>
                      <p className="mt-1 text-lg font-bold text-green-700">
                        $
                        {(Number(vehicle.customer_advance) || 0).toLocaleString(
                          "es-CL",
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#0f4471]/20 bg-[#0f4471]/5 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Saldo pendiente
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#0f4471]">
                        $
                        {Math.max(
                          0,
                          getVehicleWorkTotal(vehicle) -
                            (Number(vehicle.customer_advance) || 0),
                        ).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Cliente
                    </p>

                    <p className="text-sm font-semibold text-gray-900">
                      {vehicle.customer_name || "Sin cliente"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {vehicle.customer_rut || "-"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {vehicle.customer_phone || "-"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {vehicle.customer_address || "-"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vehicle.customer_city || "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      vehículo
                    </p>

                    <p className="text-sm text-gray-700">
                      {vehicle.tipo_vehiculo} · {vehicle.ano}
                    </p>

                    <p className="text-xs text-gray-500">
                      KM: {vehicle.kilometraje} · Combustible:{" "}
                      {vehicle.cantidad_combustible}%
                    </p>

                    <p className="text-xs text-gray-500">
                      Color ingreso: {vehicle.color || "-"}
                    </p>

                    <p className="text-xs text-gray-500">
                      Estado: {vehicle.estado}
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Servicios
                    </p>

                    {parseStoredReviewServices(vehicle.servicios).length > 0 ? (
                      <ul className="text-xs text-gray-700 list-disc pl-4 mt-2 space-y-1">
                        {parseStoredReviewServices(vehicle.servicios).map(
                          (service) => (
                            <li key={service.name}>
                              {serializeReviewService(service)}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">
                        Sin servicios registrados.
                      </p>
                    )}

                    <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">
                      Repuestos
                    </p>

                    {parseStoredReviewParts(vehicle.servicios).length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-700">
                        {parseStoredReviewParts(vehicle.servicios).map(
                          (part) => (
                            <li key={part.inventoryItemId}>
                              {part.name} x{part.quantity} {part.unit}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-500">
                        Sin repuestos registrados.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Detalle del trabajo
                  </p>

                  <p className="text-sm text-gray-700 mt-2">
                    {vehicle.observaciones || "Sin observaciones."}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )} */}
    </>
  );
}
