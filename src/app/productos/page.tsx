'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
  };
}

export default function ProductosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redireccionar si no está autenticado o no es admin
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    // Cargar productos
    const fetchProductos = async () => {
      try {
        const response = await fetch('/api/productos');
        if (!response.ok) {
          throw new Error('Error al cargar productos');
        }
        const data = await response.json();
        setProductos(data);
      } catch (err) {
        setError('Error al cargar productos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, [status, session, router]);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar producto');
      }

      // Actualizar la lista de productos
      setProductos(productos.filter(producto => producto.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar producto');
      }
      console.error(err);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="p-4">Cargando...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Link href="/productos/nuevo">
          <Button>Nuevo Producto</Button>
        </Link>
      </div>

      {productos.length === 0 ? (
        <p>No hay productos registrados.</p>
      ) : (
        <Table
          headers={[
            'Nombre',
            'Categoría',
            'Descripción',
            'Estado',
            'Acciones',
          ]}
        >
          {productos.map((producto) => (
            <TableRow key={producto.id}>
              <TableCell>{producto.nombre}</TableCell>
              <TableCell>{producto.categoria.nombre}</TableCell>
              <TableCell>{producto.descripcion || '-'}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${producto.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/productos/${producto.id}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminar(producto.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}