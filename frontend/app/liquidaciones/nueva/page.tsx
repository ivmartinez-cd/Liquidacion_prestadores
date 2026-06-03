"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Prestador {
  id: number;
  nombre_corto: string;
  nombre: string;
  activo: boolean;
}

interface Resultado {
  liquidacion_id: number;
  total_incidentes: number;
  total_alertas: number;
  mensaje: string;
}

export default function NuevaLiquidacionPage() {
  const router = useRouter();
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [prestadorId, setPrestadorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPrestadores().then((data) => setPrestadores(data.filter((p: Prestador) => p.activo)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestadorId || !file) {
      setError("Seleccioná un prestador y un archivo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prestador_id", prestadorId);
      const res = await api.importarLiquidacion(fd);
      if (res.detail) {
        setError(res.detail);
      } else {
        setResultado(res);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  if (resultado) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h3 className="font-semibold text-green-800 mb-2">Importación exitosa</h3>
          <p className="text-sm text-green-700">{resultado.mensaje}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-green-600">Incidentes procesados:</dt>
            <dd className="font-semibold text-green-800">{resultado.total_incidentes}</dd>
          </dl>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/liquidaciones/${resultado.liquidacion_id}`)}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700"
          >
            Ver liquidación
          </button>
          <button
            onClick={() => setResultado(null)}
            className="px-4 text-sm text-gray-600 hover:text-gray-800"
          >
            Nueva importación
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Importar liquidación</h2>
        <p className="text-sm text-gray-500">
          Seleccioná el PST y el archivo .xls exportado desde la aplicación web
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prestador</label>
          <select
            value={prestadorId}
            onChange={(e) => setPrestadorId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccioná un prestador...</option>
            {prestadores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre_corto} — {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Archivo de liquidación (.xls / .html)
          </label>
          <input
            type="file"
            accept=".xls,.xlsx,.html,.htm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Archivo exportado desde la aplicación web (liquidacion_XXXX-X_YYYYMMDD.xls)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Importando y analizando..." : "Importar y analizar"}
        </button>
      </form>

      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">El sistema detectará automáticamente:</p>
        <p>• Precios incorrectos según tarifario (ALT001)</p>
        <p>• KMs incorrectos según Tabla KM (ALT002)</p>
        <p>• Viáticos duplicados en la misma sucursal (ALT003)</p>
        <p>• Incidentes ya liquidados anteriormente (ALT004)</p>
        <p>• Tarifario o Tabla KM inexistentes (ALT008, ALT009)</p>
      </div>
    </div>
  );
}
