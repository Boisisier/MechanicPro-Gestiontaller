import { StrictMode, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { publicFetch } from "./publicClient";
import "../index.css";

export default function RecuperarPage() {
  const [patente, setPatente] = useState("");
  const [rutPrefix, setRutPrefix] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const result = (await publicFetch("/public/recover-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente, rut_prefix: rutPrefix }),
      })) as { message: string };
      setMessage(
        result.message ||
          "Si los datos coinciden con una orden activa, enviamos el link al teléfono registrado."
      );
    } catch {
      // Mismo mensaje genérico también si falla la red/el server: no distinguir "no
      // encontramos nada" de "no pudimos conectar" evita dar pistas de más.
      setMessage("Si los datos coinciden con una orden activa, enviamos el link al teléfono registrado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-xl font-bold text-[#0f4471]">MechanicPro</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Recuperar acceso
          </p>
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            ¿Perdiste el link de seguimiento?
          </h1>

          {message ? (
            <p className="text-sm text-gray-700 py-4">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="patente" className="block text-sm font-medium text-gray-700 mb-1">
                  Patente del vehículo
                </label>
                <input
                  id="patente"
                  value={patente}
                  onChange={(event) => setPatente(event.target.value)}
                  placeholder="AB-CD-12"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="rutPrefix" className="block text-sm font-medium text-gray-700 mb-1">
                  Primeros dígitos del RUT del titular
                </label>
                <input
                  id="rutPrefix"
                  value={rutPrefix}
                  onChange={(event) => setRutPrefix(event.target.value)}
                  placeholder="Ej: 1234"
                  required
                  minLength={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Sin puntos ni guión, al menos 4 dígitos.</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#0f4471] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Buscando..." : "Recuperar link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RecuperarPage />
  </StrictMode>
);
