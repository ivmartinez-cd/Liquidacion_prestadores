"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/liquidaciones", label: "Liquidaciones", icon: "📄" },
  { label: "Configuración", separator: true },
  { href: "/configuracion/prestadores", label: "Prestadores", icon: "🏢" },
  { href: "/configuracion/spst", label: "SPSTs", icon: "👷" },
  { href: "/configuracion/tarifarios", label: "Tarifarios", icon: "💰" },
  { href: "/configuracion/tabla-km", label: "Tabla KM", icon: "🗺️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Asistente de</p>
        <h1 className="text-base font-bold text-white leading-tight">Liquidaciones</h1>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item, i) => {
          if ("separator" in item && item.separator) {
            return (
              <p key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-4 pb-1">
                {item.label}
              </p>
            );
          }
          if (!("href" in item)) return null;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm mb-0.5 transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        v1.0.0 — local
      </div>
    </aside>
  );
}
