'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Select, Textarea } from '@/components/ui/Form';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
}

interface Producto {
  id: string;
  nombre: string;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
    precios: {
      id: string;
      tipo: 'FABRICA' | 'MAYORISTA' | 'MINORISTA';
      valor: number;
    }[];
  };
}

// Schema para validación de pedido
const pedidoItemSchema = z.object({
  productoId: z.string().min(1, { message: 'El producto es requerido' }),
  cantidad: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'La cantidad debe ser un número' }).positive({ message: 'La cantidad debe ser mayor a 0' })
  ),
  precioUnitario: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: 'El precio debe ser un número' }).nonnegative({ message: 'El precio no puede ser negativo' })
  ),
});

const pedidoSchema = z.object({
  clienteId: z.string().min(1, { message: 'El cliente es requerido' }),
  observacion: z.string().optional().nullable(),
  items: z.array(pedidoItemSchema).min(1, { message: 'Debe agregar al menos un producto' }),
});

type PedidoFormValues = z.infer<typeof pedidoSchema>;

export default function NuevoPedidoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clienteTipo, setClienteTipo] = useState<'FABRICA' | 'MAYORISTA' | 'MINORISTA' | null>(null);

  const form = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      clienteId: '',
      observacion: '',
      items: [{ productoId: '', cantidad: 1, precioUnitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    // Redireccionar si no está autenticado
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Cargar clientes
    const fetchClientes = async () => {
      try {
        const response = await fetch('/api/clientes');
        if (!response.ok) {
          throw new Error('Error al cargar clientes');
        }
        const data = await response.json();
        setClientes(data);
      } catch (err) {
        setError('Error al cargar clientes');
        console.error(err);
      }
    };

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
      }
    };

    fetchClientes();
    fetchProductos();
  }, [status, router]);

  // Actualizar tipo de cliente cuando cambia la selección
  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      // Aquí deberíamos obtener el tipo de cliente, pero como no está en el modelo
      // vamos a asumir que es MINORISTA por defecto
      // En una implementación real, esto vendría del cliente o de su configuración
      setClienteTipo('MINORISTA');
      
      // Actualizar precios de los productos según el tipo de cliente
      const items = form.getValues('items');
      items.forEach((item, index) => {
        if (item.productoId) {
          const producto = productos.find(p => p.id === item.productoId);
          if (producto) {
            const precio = producto.categoria.precios.find(p => p.tipo === 'MINORISTA');
            if (precio) {
              form.setValue(`items.${index}.precioUnitario`, precio.valor);
            }
          }
        }
      });
    }
  };

  // Actualizar precio cuando cambia el producto
  const handleProductoChange = (productoId: string, index: number) => {
    if (!clienteTipo) return;
    
    const producto = productos.find(p => p.id === productoId);
    if (producto) {
      const precio = producto.categoria.precios.find(p => p.tipo === clienteTipo);
      if (precio) {
        form.setValue(`items.${index}.precioUnitario`, precio.valor);
      } else {
        // Si no hay precio para el tipo de cliente, usar el primer precio disponible
        if (producto.categoria.precios.length > 0) {
          form.setValue(`items.${index}.precioUnitario`, producto.categoria.precios[0].valor);
        } else {
          form.setValue(`items.${index}.precioUnitario`, 0);
        }
      }
    }
  };

  const onSubmit = async (data: PedidoFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear pedido');
      }

      router.push('/pedidos');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al crear pedido');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular total del pedido
  const calcularTotal = () => {
    const items = form.getValues('items');
    return items.reduce((total, item) => {
      return total + (item.cantidad || 0) * (item.precioUnitario || 0);
    }, 0);
  };

  if (status === 'loading') {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuevo Pedido</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <Form form={form} onSubmit={onSubmit}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="clienteId"
              label="Cliente"
              required
            >
              <Select onChange={(e) => handleClienteChange(e.target.value)}>
                <option value="">Seleccione un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {`${cliente.nombre} ${cliente.apellido}`}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              name="observacion"
              label="Observación"
            >
              <Textarea placeholder="Observaciones del pedido" rows={2} />
            </FormField>
          </div>

          <div className="border p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Productos</h2>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b last:border-b-0">
                <div className="md:col-span-2">
                  <FormField
                    name={`items.${index}.productoId`}
                    label="Producto"
                    required
                  >
                    <Select onChange={(e) => handleProductoChange(e.target.value, index)}>
                      <option value="">Seleccione un producto</option>
                      {productos.map((producto) => (
                        <option key={producto.id} value={producto.id}>
                          {`${producto.nombre} (${producto.categoria.nombre})`}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <div>
                  <FormField
                    name={`items.${index}.cantidad`}
                    label="Cantidad"
                    required
                  >
                    <Input type="number" min="1" step="1" />
                  </FormField>
                </div>

                <div>
                  <FormField
                    name={`items.${index}.precioUnitario`}
                    label="Precio Unitario"
                    required
                  >
                    <Input type="number" min="0" step="0.01" />
                  </FormField>
                </div>

                <div className="flex items-end justify-end md:col-span-4">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length <= 1}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ productoId: '', cantidad: 1, precioUnitario: 0 })}
              >
                Agregar Producto
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-xl font-bold">
              Total: ${calcularTotal().toFixed(2)}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/pedidos')}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}