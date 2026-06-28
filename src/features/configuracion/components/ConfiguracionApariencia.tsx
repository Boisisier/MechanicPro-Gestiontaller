interface ConfiguracionAparienciaProps {
  accentColor: string;

  setAccentColor: React.Dispatch<React.SetStateAction<string>>;
}

export default function ConfiguracionApariencia({
  accentColor,
  setAccentColor,
}: ConfiguracionAparienciaProps) {
  return (
    <div>
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
            <p className="text-sm font-semibold text-gray-900">
              Color principal
            </p>

            <p className="text-xs text-gray-500">{accentColor}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAccentColor("#0f4471")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Restaurar color
        </button>
      </div>
    </div>
  );
}
