'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Select, Textarea } from '@/components/ui/Form';

interface Categoria {
  id: string;
  nombre: string;
}

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

// Schema para validación de producto
const productoSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  descripcion: z.string().optional().nullable(),
  imagen: z.string().optional().nullable(),
  activo: z.boolean().default(true),
  categoriaId: z.string().min(1, { message: 'La categoría es requerida' }),
});

type ProductoFormValues = z.infer<typeof productoSchema>;

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(productoSchema) as any,
    defaultValues: {
      nombre: '',
      descripcion: '',
      imagen: '',
      activo: true,
      categoriaId: '',
    },
  });

  useEffect(() => {
    // Resolver params asíncronos
    const resolveParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

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

    // Solo proceder si tenemos el id
    if (!id) return;

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
      }
    };

    // Cargar producto
    const fetchProducto = async () => {
      try {
        const response = await fetch(`/api/productos/${id}`);
        if (!response.ok) {
          throw new Error('Error al cargar producto');
        }
        const data = await response.json();
        setProducto(data);
        
        // Establecer valores por defecto en el formulario
        form.reset({
          nombre: data.nombre,
          descripcion: data.descripcion,
          categoriaId: data.categoriaId,
          activo: data.activo,
        });
      } catch (err) {
        setError('Error al cargar producto');
        console.error(err);
      }
    };

    fetchCategorias();
    fetchProducto();
  }, [status, session, router, id, form]);

  const onSubmit = async (data: ProductoFormValues) => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar producto');
      }

      router.push('/productos');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al actualizar producto');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !producto) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar Producto</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            name="nombre"
            label="Nombre"
            required
          >
            <Input placeholder="Nombre del producto" />
          </FormField>

          <FormField
            name="descripcion"
            label="Descripción"
          >
            <Textarea placeholder="Descripción del producto" />
          </FormField>

          <FormField
            name="categoriaId"
            label="Categoría"
            required
          >
            <Select>
              <option value="">Seleccione una categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            name="activo"
            label="Estado"
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                {...form.register('activo')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2">Activo</span>
            </div>
          </FormField>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/productos')}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}