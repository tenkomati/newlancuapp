'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Select } from '@/components/ui/Form';

interface Categoria {
  id: string;
  nombre: string;
}

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

// Schema para validación de precio
const precioSchema = z.object({
  tipo: z.enum(['FABRICA', 'MAYORISTA', 'MINORISTA'], {
    message: 'Seleccione un tipo de precio válido',
  }),
  valor: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.coerce.number({ message: 'El valor debe ser un número' }).positive({ message: 'El precio debe ser mayor a 0' })
  ),
  fechaInicio: z.string().min(1, { message: 'La fecha de inicio es requerida' }),
  fechaFin: z.string().optional().nullable(),
  activo: z.boolean().default(true),
  categoriaId: z.string().min(1, { message: 'La categoría es requerida' }),
});

type PrecioFormValues = z.infer<typeof precioSchema>;

export default function EditarPrecioPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [precio, setPrecio] = useState<Precio | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(precioSchema) as any,
    defaultValues: {
      tipo: 'FABRICA' as const,
      valor: 0,
      fechaInicio: '',
      fechaFin: null,
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

    // Cargar precio
    const fetchPrecio = async () => {
      try {
        const response = await fetch(`/api/precios/${id}`);
        if (!response.ok) {
          throw new Error('Error al cargar precio');
        }
        const data = await response.json();
        setPrecio(data);
        
        // Formatear fechas para el formulario
        const fechaInicio = new Date(data.fechaInicio).toISOString().split('T')[0];
        const fechaFin = data.fechaFin ? new Date(data.fechaFin).toISOString().split('T')[0] : null;
        
        // Establecer valores por defecto en el formulario
        form.reset({
          tipo: data.tipo,
          valor: data.valor,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          activo: data.activo,
          categoriaId: data.categoriaId,
        } as any);
      } catch (err) {
        setError('Error al cargar precio');
        console.error(err);
      }
    };

    fetchCategorias();
    fetchPrecio();
  }, [status, session, router, id, form]);

  const onSubmit = async (data: PrecioFormValues) => {
    setLoading(true);
    setError(null);

    try {
      if (!id) return;
      
      const response = await fetch(`/api/precios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar precio');
      }

      router.push('/precios');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al actualizar precio');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !precio) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar Precio</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
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
            name="tipo"
            label="Tipo de Precio"
            required
          >
            <Select>
              <option value="">Seleccione un tipo</option>
              <option value="FABRICA">Fábrica</option>
              <option value="MAYORISTA">Mayorista</option>
              <option value="MINORISTA">Minorista</option>
            </Select>
          </FormField>

          <FormField
            name="valor"
            label="Valor"
            required
          >
            <Input type="number" step="0.01" min="0" placeholder="0.00" />
          </FormField>

          <FormField
            name="fechaInicio"
            label="Fecha de Inicio"
            required
          >
            <Input type="date" />
          </FormField>

          <FormField
            name="fechaFin"
            label="Fecha de Fin"
          >
            <Input type="date" />
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
              onClick={() => router.push('/precios')}
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