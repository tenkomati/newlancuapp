'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  productos: Array<{ id: string; nombre: string }>;
  precios: Array<{ id: string; precio: number }>;
}

export default function CategoriasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
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

    // Cargar categorías
    const fetchCategorias = async () => {
      try {
        const response = await fetch('/api/categorias');
        if (!response.ok) {
          throw new Error('Error al cargar categorías');
        }
        const data = await response.json();
        setCategorias(data);
      } catch (err) {
        setError('Error al cargar categorías');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, [status, session, router]);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta categoría?')) return;

    try {
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar categoría');
      }

      // Actualizar la lista de categorías
      setCategorias(categorias.filter(categoria => categoria.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar categoría');
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
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Link href="/categorias/nuevo">
          <Button>Nueva Categoría</Button>
        </Link>
      </div>

      {categorias.length === 0 ? (
        <p>No hay categorías registradas.</p>
      ) : (
        <Table
          headers={[
            'Nombre',
            'Descripción',
            'Productos',
            'Precios Activos',
            'Acciones',
          ]}
        >
          {categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell>{categoria.nombre}</TableCell>
              <TableCell>{categoria.descripcion || '-'}</TableCell>
              <TableCell>{categoria.productos?.length || 0}</TableCell>
              <TableCell>{categoria.precios?.length || 0}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/categorias/${categoria.id}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminar(categoria.id)}
                    disabled={categoria.productos?.length > 0 || categoria.precios?.length > 0}
                    title={categoria.productos?.length > 0 || categoria.precios?.length > 0 ? 
                      'No se puede eliminar una categoría con productos o precios asociados' : ''}
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