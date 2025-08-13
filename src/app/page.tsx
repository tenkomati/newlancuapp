import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/Button';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Obtener estadísticas básicas
  let stats = {
    clientes: 0,
    productos: 0,
    pedidosPendientes: 0,
    repartos: 0
  };
  
  if (session) {
    // Contar clientes
    const clientesCount = await db.cliente.count();
    
    // Contar productos
    const productosCount = await db.producto.count();
    
    // Contar pedidos pendientes
    const pedidosPendientesCount = await db.pedido.count({
      where: { estado: 'PENDIENTE' }
    });
    
    // Contar repartos activos
    const repartosCount = await db.reparto.count();
    
    stats = {
      clientes: clientesCount,
      productos: productosCount,
      pedidosPendientes: pedidosPendientesCount,
      repartos: repartosCount
    };
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {!session ? (
        // Página de bienvenida para usuarios no autenticados
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-4">Bienvenido a LancuApp</h1>
          <p className="text-xl text-gray-600 max-w-2xl mb-12">
            Sistema de gestión para distribuidora mayorista de helados
          </p>
          <Link href="/login">
            <Button size="lg" variant="primary" className="px-8 py-6 text-lg">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      ) : (
        // Dashboard para usuarios autenticados
        <div className="w-full max-w-7xl">
          <h1 className="text-3xl font-bold text-blue-600 mb-8">Dashboard</h1>
          
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700">Clientes</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.clientes}</p>
              <Link href="/clientes" className="text-blue-600 hover:underline text-sm inline-block mt-2">
                Ver todos
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700">Productos</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.productos}</p>
              <Link href="/productos" className="text-blue-600 hover:underline text-sm inline-block mt-2">
                Ver todos
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700">Pedidos Pendientes</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pedidosPendientes}</p>
              <Link href="/pedidos" className="text-blue-600 hover:underline text-sm inline-block mt-2">
                Ver todos
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700">Repartos</h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.repartos}</p>
              <Link href="/repartos" className="text-blue-600 hover:underline text-sm inline-block mt-2">
                Ver todos
              </Link>
            </div>
          </div>
          
          {/* Secciones principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Acciones rápidas */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-blue-600 mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
                <Link href="/pedidos/nuevo">
                  <Button variant="secondary" className="w-full justify-start">
                    Crear Nuevo Pedido
                  </Button>
                </Link>
                
                {session?.user?.role === 'ADMIN' && (
                  <>
                    <Link href="/repartos/nuevo">
                      <Button variant="secondary" className="w-full justify-start">
                        Crear Nuevo Reparto
                      </Button>
                    </Link>
                    <Link href="/productos/nuevo">
                      <Button variant="secondary" className="w-full justify-start">
                        Agregar Nuevo Producto
                      </Button>
                    </Link>
                    <Link href="/clientes/nuevo">
                      <Button variant="secondary" className="w-full justify-start">
                        Registrar Nuevo Cliente
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            {/* Información de usuario y enlaces de administración */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-blue-600 mb-4">Información de Usuario</h2>
              <div className="space-y-2 mb-6">
                <p><span className="font-semibold">Nombre:</span> {session?.user?.name}</p>
                <p><span className="font-semibold">Email:</span> {session?.user?.email}</p>
                <p><span className="font-semibold">Rol:</span> {session?.user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</p>
              </div>
              
              {session?.user?.role === 'ADMIN' && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Administración</h3>
                  <div className="space-y-3">
                    <Link href="/usuarios">
                      <Button variant="secondary" className="w-full justify-start">
                        Gestionar Usuarios
                      </Button>
                    </Link>
                    <Link href="/categorias">
                      <Button variant="secondary" className="w-full justify-start">
                        Gestionar Categorías
                      </Button>
                    </Link>
                    <Link href="/precios">
                      <Button variant="secondary" className="w-full justify-start">
                        Gestionar Precios
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
