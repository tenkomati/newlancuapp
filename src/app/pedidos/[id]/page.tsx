'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
}

interface Producto {
  id: string;
  nombre: string;
  categoria: {
    id: string;
    nombre: string;
  };
}

interface PedidoItem {
  id: string;
  cantidad: number;
  precioUnitario: number;
  producto: Producto;
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
  items: PedidoItem[];
  total: number;
}

export default function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [repartos, setRepartos] = useState<Reparto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [repartoId, setRepartoId] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    // Resolver params asíncronos
    const resolveParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    // Redireccionar si no está autenticado
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Solo proceder si tenemos el id
    if (!id) return;

    // Cargar pedido
    const fetchPedido = async () => {
      try {
        const response = await fetch(`/api/pedidos/${id}`);
        if (!response.ok) {
          throw new Error('Error al cargar pedido');
        }
        const data = await response.json();
        setPedido(data);
        setObservacion(data.observacion || '');
        setRepartoId(data.reparto?.id || '');
      } catch (err) {
        setError('Error al cargar pedido');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Cargar repartos disponibles
    const fetchRepartos = async () => {
      try {
        const response = await fetch('/api/repartos');
        if (!response.ok) {
          throw new Error('Error al cargar repartos');
        }
        const data = await response.json();
        setRepartos(data);
      } catch (err) {
        console.error('Error al cargar repartos:', err);
      }
    };

    fetchPedido();
    fetchRepartos();
  }, [status, router, id]);

  const handleCancelar = async () => {
    if (!confirm('¿Está seguro de cancelar este pedido?')) return;
    if (!id) return;

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cancelar pedido');
      }

      // Actualizar el estado del pedido
      if (pedido) {
        setPedido({ ...pedido, estado: 'CANCELADO' });
      }
      setEditMode(false);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al cancelar pedido');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarcarPagado = async () => {
    if (!pedido) return;
    if (!id) return;

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pagado: !pedido.pagado }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar estado de pago');
      }

      // Actualizar el estado del pedido
      setPedido({ ...pedido, pagado: !pedido.pagado });
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al actualizar estado de pago');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarcarEntregado = async () => {
    if (!pedido) return;
    if (!id) return;

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: 'ENTREGADO' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar estado del pedido');
      }

      // Actualizar el estado del pedido
      setPedido({ ...pedido, estado: 'ENTREGADO' });
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al actualizar estado del pedido');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!pedido) return;
    if (!id) return;

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          observacion,
          repartoId: repartoId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar pedido');
      }

      // Recargar el pedido para obtener los datos actualizados
      const updatedResponse = await fetch(`/api/pedidos/${id}`);
      if (!updatedResponse.ok) {
        throw new Error('Error al recargar pedido');
      }
      const updatedData = await updatedResponse.json();
      setPedido(updatedData);
      setEditMode(false);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al actualizar pedido');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
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

  if (!pedido) {
    return <div className="p-4">Pedido no encontrado</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedido #{pedido.id.substring(0, 8)}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/pedidos')}
          >
            Volver
          </Button>
          {session?.user.role === 'ADMIN' && !editMode && (
            <Button
              variant="primary"
              onClick={() => setEditMode(true)}
              disabled={pedido.estado === 'CANCELADO'}
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Información General</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Fecha</p>
            <p>{formatDate(pedido.fecha)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p>{`${pedido.cliente.nombre} ${pedido.cliente.apellido}`}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${pedido.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' : pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {pedido.estado}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pago</p>
            <p className={`inline-block px-2 py-1 rounded text-xs font-medium ${pedido.pagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {pedido.pagado ? 'PAGADO' : 'PENDIENTE'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Reparto</p>
            {editMode ? (
              <select
                className="w-full p-2 border rounded"
                value={repartoId}
                onChange={(e) => setRepartoId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {repartos.map((reparto) => (
                  <option key={reparto.id} value={reparto.id}>
                    {formatDate(reparto.fecha)} - {reparto.zona}
                  </option>
                ))}
              </select>
            ) : (
              <p>
                {pedido.reparto ? (
                  `${formatDate(pedido.reparto.fecha)} - ${pedido.reparto.zona}`
                ) : (
                  <span className="text-gray-500">Sin asignar</span>
                )}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Observación</p>
            {editMode ? (
              <textarea
                className="w-full p-2 border rounded"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
              />
            ) : (
              <p>{pedido.observacion || <span className="text-gray-500">Sin observaciones</span>}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedido.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.producto.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.producto.categoria.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">{item.cantidad}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">${item.precioUnitario.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">${(item.cantidad * item.precioUnitario).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-6 py-4 text-right font-bold">Total:</td>
                <td className="px-6 py-4 text-right font-bold">${pedido.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {editMode ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(false);
                setObservacion(pedido.observacion || '');
                setRepartoId(pedido.reparto?.id || '');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleGuardarCambios}
              isLoading={loadingAction}
            >
              Guardar Cambios
            </Button>
          </>
        ) : (
          <>
            {pedido.estado !== 'CANCELADO' && (
              <Button
                variant="danger"
                onClick={handleCancelar}
                isLoading={loadingAction}
                disabled={pedido.estado === 'ENTREGADO'}
              >
                Cancelar Pedido
              </Button>
            )}
            {session?.user.role === 'ADMIN' && (
              <Button
                variant={pedido.pagado ? 'warning' : 'success'}
                onClick={handleMarcarPagado}
                isLoading={loadingAction}
              >
                {pedido.pagado ? 'Marcar No Pagado' : 'Marcar Pagado'}
              </Button>
            )}
            {session?.user.role === 'ADMIN' && pedido.estado === 'PENDIENTE' && (
              <Button
                variant="success"
                onClick={handleMarcarEntregado}
                isLoading={loadingAction}
              >
                Marcar Entregado
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}