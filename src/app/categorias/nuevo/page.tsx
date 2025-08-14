'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Textarea } from '@/components/ui/Form';

// Schema para validación de categoría
const categoriaSchema = z.object({
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  descripcion: z.string().optional().nullable(),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

export default function NuevaCategoriaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
    },
  });

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
  }, [status, session, router]);

  const onSubmit = async (data: CategoriaFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/categorias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear categoría');
      }

      router.push('/categorias');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al crear categoría');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nueva Categoría</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            name="nombre"
            label="Nombre"
            required
          >
            <Input placeholder="Nombre de la categoría" />
          </FormField>

          <FormField
            name="descripcion"
            label="Descripción"
          >
            <Textarea placeholder="Descripción de la categoría" rows={3} />
          </FormField>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/categorias')}
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