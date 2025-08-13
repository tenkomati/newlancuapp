'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

interface Precio {
  id: string;
  tipo: 'FABRICA' | 'MAYORISTA' | 'MINORISTA';
  valor: number;
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
  };
}

export default function PreciosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [precios, setPrecios] = useState<Precio[]>([]);
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

    // Cargar precios
    const fetchPrecios = async () => {
      try {
        const response = await fetch('/api/precios');
        if (!response.ok) {
          throw new Error('Error al cargar precios');
        }
        const data = await response.json();
        setPrecios(data);
      } catch (err) {
        setError('Error al cargar precios');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrecios();
  }, [status, session, router]);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este precio?')) return;

    try {
      const response = await fetch(`/api/precios/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar precio');
      }

      // Actualizar la lista de precios
      setPrecios(precios.filter(precio => precio.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar precio');
      }
      console.error(err);
    }
  };

  const formatTipo = (tipo: string) => {
    const tipos = {
      FABRICA: 'Fábrica',
      MAYORISTA: 'Mayorista',
      MINORISTA: 'Minorista',
    };
    return tipos[tipo as keyof typeof tipos] || tipo;
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatPrecio = (valor: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(valor);
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
        <h1 className="text-2xl font-bold">Precios</h1>
        <Link href="/precios/nuevo">
          <Button>Nuevo Precio</Button>
        </Link>
      </div>

      {precios.length === 0 ? (
        <p>No hay precios registrados.</p>
      ) : (
        <Table
          headers={[
            'Categoría',
            'Tipo',
            'Valor',
            'Fecha Inicio',
            'Fecha Fin',
            'Estado',
            'Acciones',
          ]}
        >
          {precios.map((precio) => (
            <TableRow key={precio.id}>
              <TableCell>{precio.categoria.nombre}</TableCell>
              <TableCell>{formatTipo(precio.tipo)}</TableCell>
              <TableCell>{formatPrecio(precio.valor)}</TableCell>
              <TableCell>{formatFecha(precio.fechaInicio)}</TableCell>
              <TableCell>{precio.fechaFin ? formatFecha(precio.fechaFin) : '-'}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${precio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {precio.activo ? 'Activo' : 'Inactivo'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/precios/${precio.id}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminar(precio.id)}
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