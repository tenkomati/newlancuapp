'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const navLinks = [
    { href: '/', label: 'Inicio', access: 'all' },
    { href: '/pedidos', label: 'Pedidos', access: 'all' },
    { href: '/clientes', label: 'Clientes', access: 'admin' },
    { href: '/productos', label: 'Productos', access: 'admin' },
    { href: '/precios', label: 'Precios', access: 'admin' },
    { href: '/usuarios', label: 'Usuarios', access: 'admin' },
    { href: '/repartos', label: 'Repartos', access: 'admin' },
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">LancuApp</span>
          </div>

          <div className="hidden md:flex space-x-4">
            {navLinks.map((link) => {
              if (link.access === 'admin' && !isAdmin) return null;
              
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-500'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-md text-sm font-medium bg-blue-700 hover:bg-blue-800"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}