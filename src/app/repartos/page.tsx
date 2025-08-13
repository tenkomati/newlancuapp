'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

interface Pedido {
  id: string;
  cliente: {
    nombre: string;
    apellido: string;
  };
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  pagado: boolean;
  total: number;
}

interface Reparto {
  id: string;
  fecha: string;
  zona: string;
  pedidos: Pedido[];
}

export default function RepartosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repartos, setRepartos] = useState<Reparto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redireccionar si no está autenticado
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Cargar repartos
    const fetchRepartos = async () => {
      try {
        const response = await fetch('/api/repartos');
        if (!response.ok) {
          throw new Error('Error al cargar repartos');
        }
        const data = await response.json();
        setRepartos(data);
      } catch (err) {
        setError('Error al cargar repartos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepartos();
  }, [status, router]);

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este reparto?')) return;

    try {
      const response = await fetch(`/api/repartos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar reparto');
      }

      // Actualizar la lista de repartos
      setRepartos(repartos.filter(reparto => reparto.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar reparto');
      }
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  const contarPedidosPendientes = (pedidos: Pedido[]) => {
    return pedidos.filter(pedido => pedido.estado === 'PENDIENTE').length;
  };

  const contarPedidosEntregados = (pedidos: Pedido[]) => {
    return pedidos.filter(pedido => pedido.estado === 'ENTREGADO').length;
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
        <h1 className="text-2xl font-bold">Repartos</h1>
        {session?.user.role === 'ADMIN' && (
          <Link href="/repartos/nuevo">
            <Button>Nuevo Reparto</Button>
          </Link>
        )}
      </div>

      {repartos.length === 0 ? (
        <p>No hay repartos registrados.</p>
      ) : (
        <Table
          headers={[
            'Fecha',
            'Zona',
            'Pedidos',
            'Pendientes',
            'Entregados',
            'Acciones',
          ]}
        >
          {repartos.map((reparto) => (
            <TableRow key={reparto.id}>
              <TableCell>{formatDate(reparto.fecha)}</TableCell>
              <TableCell>{reparto.zona}</TableCell>
              <TableCell>{reparto.pedidos.length}</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  {contarPedidosPendientes(reparto.pedidos)}
                </span>
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  {contarPedidosEntregados(reparto.pedidos)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/repartos/${reparto.id}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                  {session?.user.role === 'ADMIN' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleEliminar(reparto.id)}
                      disabled={contarPedidosEntregados(reparto.pedidos) > 0}
                      title={contarPedidosEntregados(reparto.pedidos) > 0 ? 
                        'No se puede eliminar un reparto con pedidos entregados' : ''}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}