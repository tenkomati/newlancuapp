'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Select } from '@/components/ui/Form';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
}

interface Pedido {
  id: string;
  fecha: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  pagado: boolean;
  cliente: Cliente;
  total: number;
}

interface Reparto {
  id: string;
  fecha: string;
  zona: string;
  pedidos: Pedido[];
}

// Schema para validación de reparto
const repartoSchema = z.object({
  fecha: z.string().min(1, { message: 'La fecha es requerida' }),
  zona: z.string().min(1, { message: 'La zona es requerida' }),
});

type RepartoFormValues = z.infer<typeof repartoSchema>;

export default function DetalleRepartoPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reparto, setReparto] = useState<Reparto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const form = useForm<RepartoFormValues>({
    resolver: zodResolver(repartoSchema),
    defaultValues: {
      fecha: '',
      zona: '',
    },
  });

  useEffect(() => {
    // Redireccionar si no está autenticado
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Cargar reparto
    const fetchReparto = async () => {
      try {
        const response = await fetch(`/api/repartos/${params.id}`);
        if (!response.ok) {
          throw new Error('Error al cargar reparto');
        }
        const data = await response.json();
        setReparto(data);
        
        // Formatear fecha para el formulario
        const fecha = new Date(data.fecha).toISOString().split('T')[0];
        
        // Establecer valores por defecto en el formulario
        form.reset({
          fecha: fecha,
          zona: data.zona,
        });
      } catch (err) {
        setError('Error al cargar reparto');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReparto();
  }, [status, router, params.id, form]);

  const handleEliminar = async () => {
    if (!confirm('¿Está seguro de eliminar este reparto?')) return;

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/repartos/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar reparto');
      }

      router.push('/repartos');
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar reparto');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const onSubmit = async (data: RepartoFormValues) => {
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/repartos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar reparto');
      }

      // Recargar el reparto para obtener los datos actualizados
      const updatedResponse = await fetch(`/api/repartos/${params.id}`);
      if (!updatedResponse.ok) {
        throw new Error('Error al recargar reparto');
      }
      const updatedData = await updatedResponse.json();
      setReparto(updatedData);
      setEditMode(false);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al actualizar reparto');
      }
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarcarEntregado = async (pedidoId: string) => {
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
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

      // Actualizar el estado del pedido en la lista
      if (reparto) {
        const updatedPedidos = reparto.pedidos.map(pedido => {
          if (pedido.id === pedidoId) {
            return { ...pedido, estado: 'ENTREGADO' as const };
          }
          return pedido;
        });
        setReparto({ ...reparto, pedidos: updatedPedidos });
      }
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

  if (!reparto) {
    return <div className="p-4">Reparto no encontrado</div>;
  }

  const tieneEntregados = contarPedidosEntregados(reparto.pedidos) > 0;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reparto {formatDate(reparto.fecha)} - {reparto.zona}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/repartos')}
          >
            Volver
          </Button>
          {session?.user.role === 'ADMIN' && !editMode && (
            <Button
              variant="primary"
              onClick={() => setEditMode(true)}
              disabled={tieneEntregados}
              title={tieneEntregados ? 'No se puede editar un reparto con pedidos entregados' : ''}
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      {editMode ? (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Editar Reparto</h2>
          </div>
          <div className="p-4">
            <Form form={form} onSubmit={form.handleSubmit(onSubmit as any)}>
              <div className="space-y-4">
                <FormField
                  name="fecha"
                  label="Fecha"
                  required
                >
                  <Input type="date" />
                </FormField>

                <FormField
                  name="zona"
                  label="Zona"
                  required
                >
                  <Select>
                    <option value="">Seleccione una zona</option>
                    <option value="NORTE">Norte</option>
                    <option value="SUR">Sur</option>
                    <option value="ESTE">Este</option>
                    <option value="OESTE">Oeste</option>
                    <option value="CENTRO">Centro</option>
                  </Select>
                </FormField>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={loadingAction}>
                    Guardar
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Información General</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p>{formatDate(reparto.fecha)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Zona</p>
              <p>{reparto.zona}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Pedidos</p>
              <p>{reparto.pedidos.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pedidos Pendientes</p>
              <p className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {contarPedidosPendientes(reparto.pedidos)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pedidos Entregados</p>
              <p className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                {contarPedidosEntregados(reparto.pedidos)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Pedidos</h2>
        </div>
        {reparto.pedidos.length === 0 ? (
          <div className="p-4">
            <p>No hay pedidos asignados a este reparto.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reparto.pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{`${pedido.cliente.nombre} ${pedido.cliente.apellido}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(pedido.fecha)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">${pedido.total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${pedido.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' : pedido.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${pedido.pagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {pedido.pagado ? 'PAGADO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/pedidos/${pedido.id}`)}
                        >
                          Ver
                        </Button>
                        {session?.user.role === 'ADMIN' && pedido.estado === 'PENDIENTE' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleMarcarEntregado(pedido.id)}
                            isLoading={loadingAction}
                          >
                            Entregar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {session?.user.role === 'ADMIN' && !editMode && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={handleEliminar}
            isLoading={loadingAction}
            disabled={tieneEntregados}
            title={tieneEntregados ? 'No se puede eliminar un reparto con pedidos entregados' : ''}
          >
            Eliminar Reparto
          </Button>
        </div>
      )}
    </div>
  );
}