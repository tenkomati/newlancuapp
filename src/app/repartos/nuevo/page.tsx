'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Form, FormField, Input, Select } from '@/components/ui/Form';

// Schema para validación de reparto
const repartoSchema = z.object({
  fecha: z.string().min(1, { message: 'La fecha es requerida' }),
  zona: z.string().min(1, { message: 'La zona es requerida' }),
});

type RepartoFormValues = z.infer<typeof repartoSchema>;

export default function NuevoRepartoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RepartoFormValues>({
    resolver: zodResolver(repartoSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      zona: '',
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

  const onSubmit = async (data: RepartoFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/repartos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear reparto');
      }

      router.push('/repartos');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al crear reparto');
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
      <h1 className="text-2xl font-bold mb-6">Nuevo Reparto</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

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
              onClick={() => router.push('/repartos')}
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