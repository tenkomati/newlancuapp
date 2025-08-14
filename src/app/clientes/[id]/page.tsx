'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, Input } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  zona: z.string().min(1, 'La zona es requerida'),
  activo: z.boolean().default(true),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(clienteSchema) as any,
    defaultValues: {
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      zona: '',
      activo: true,
    },
  });

  // Resolver params asíncronos
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Cargar datos del cliente
  useEffect(() => {
    // Solo proceder si tenemos el id
    if (!id) return;

    const fetchCliente = async () => {
      try {
        const response = await fetch(`/api/clientes/${id}`);
        if (!response.ok) {
          throw new Error('Error al cargar cliente');
        }
        const data = await response.json();
        reset(data);
      } catch (err) {
        setError('Error al cargar los datos del cliente');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCliente();
  }, [id, reset]);

  const onSubmit = async (data: ClienteFormValues) => {
    if (!id) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar cliente');
      }

      router.push('/clientes');
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al actualizar cliente');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editar Cliente</h1>
        <Link href="/clientes">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <Form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit)(e);
        }}>
          <FormField
            label="Nombre"
            htmlFor="nombre"
            error={errors.nombre?.message}
          >
            <Input
              id="nombre"
              type="text"
              error={!!errors.nombre}
              {...register('nombre')}
            />
          </FormField>

          <FormField
            label="Dirección"
            htmlFor="direccion"
            error={errors.direccion?.message}
          >
            <Input
              id="direccion"
              type="text"
              error={!!errors.direccion}
              {...register('direccion')}
            />
          </FormField>

          <FormField
            label="Teléfono"
            htmlFor="telefono"
            error={errors.telefono?.message}
          >
            <Input
              id="telefono"
              type="text"
              error={!!errors.telefono}
              {...register('telefono')}
            />
          </FormField>

          <FormField
            label="Email (opcional)"
            htmlFor="email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              error={!!errors.email}
              {...register('email')}
            />
          </FormField>

          <FormField
            label="Zona"
            htmlFor="zona"
            error={errors.zona?.message}
          >
            <Input
              id="zona"
              type="text"
              error={!!errors.zona}
              {...register('zona')}
            />
          </FormField>

          <div className="flex items-center mt-4 mb-6">
            <input
              id="activo"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              {...register('activo')}
            />
            <label
              htmlFor="activo"
              className="ml-2 block text-sm text-gray-900"
            >
              Cliente activo
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href="/clientes">
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Guardar
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}