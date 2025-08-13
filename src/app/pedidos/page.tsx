'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
}

interface Reparto {
  id: string;
  fecha: string;
  zona: string;
}

interface Pedido {
  id: string;
  fecha: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  pagado: boolean;
  observacion: string | null;
  cliente: Cliente;
  reparto: Reparto | null;
  total: number;
}

export default function PedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redireccionar si no está autenticado
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Cargar pedidos
    const fetchPedidos = async () => {
      try {
        const response = await fetch('/api/pedidos');
        if (!response.ok) {
          throw new Error('Error al cargar pedidos');
        }
        const data = await response.json();
        setPedidos(data);
      } catch (err) {
        setError('Error al cargar pedidos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [status, router]);

  const handleCancelar = async (id: string) => {
    if (!confirm('¿Está seguro de cancelar este pedido?')) return;

    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cancelar pedido');
      }

      // Actualizar la lista de pedidos
      setPedidos(pedidos.map(pedido => {
        if (pedido.id === id) {
          return { ...pedido, estado: 'CANCELADO' as const };
        }
        return pedido;
      }));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al cancelar pedido');
      }
      console.error(err);
    }
  };

  const handleMarcarPagado = async (id: string, pagado: boolean) => {
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pagado: !pagado }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar estado de pago');
      }

      // Actualizar la lista de pedidos
      setPedidos(pedidos.map(pedido => {
        if (pedido.id === id) {
          return { ...pedido, pagado: !pagado };
        }
        return pedido;
      }));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al actualizar estado de pago');
      }
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
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
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Link href="/pedidos/nuevo">
          <Button>Nuevo Pedido</Button>
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p>No hay pedidos registrados.</p>
      ) : (
        <Table
          headers={[
            'Fecha',
            'Cliente',
            'Total',
            'Estado',
            'Pago',
            'Reparto',
            'Acciones',
          ]}
        >
          {pedidos.map((pedido) => (
            <TableRow key={pedido.id}>
              <TableCell>{formatDate(pedido.fecha)}</TableCell>
              <TableCell>{`${pedido.cliente.nombre} ${pedido.cliente.apellido}`}</TableCell>
              <TableCell>${pedido.total.toFixed(2)}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${pedido.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' : pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {pedido.estado}
                </span>
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${pedido.pagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {pedido.pagado ? 'PAGADO' : 'PENDIENTE'}
                </span>
              </TableCell>
              <TableCell>
                {pedido.reparto ? (
                  <span className="text-sm">
                    {formatDate(pedido.reparto.fecha)} - {pedido.reparto.zona}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Sin asignar</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/pedidos/${pedido.id}`}>
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                  </Link>
                  {pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CANCELADO' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelar(pedido.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                  {session?.user.role === 'ADMIN' && (
                    <Button
                      variant={pedido.pagado ? 'warning' : 'success'}
                      size="sm"
                      onClick={() => handleMarcarPagado(pedido.id, pedido.pagado)}
                    >
                      {pedido.pagado ? 'Marcar No Pagado' : 'Marcar Pagado'}
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