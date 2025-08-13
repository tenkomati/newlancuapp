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

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: 'ADMIN' | 'USER';
  clienteId: string | null;
  cliente: Cliente | null;
}

// Schema para validación de usuario en edición
const usuarioEditSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().optional().or(z.literal('')),
  nombre: z.string().min(1, { message: 'El nombre es requerido' }),
  apellido: z.string().min(1, { message: 'El apellido es requerido' }),
  role: z.enum(['ADMIN', 'USER'], {
    errorMap: () => ({ message: 'Seleccione un rol válido' }),
  }),
  clienteId: z.string().optional().nullable(),
});

type UsuarioEditFormValues = z.infer<typeof usuarioEditSchema>;

export default function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UsuarioEditFormValues>({
    resolver: zodResolver(usuarioEditSchema),
    defaultValues: {
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      role: 'USER',
      clienteId: '',
    },
  });

  const watchRole = form.watch('role');

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

    // Cargar usuario
    const fetchUsuario = async () => {
      try {
        const response = await fetch(`/api/usuarios/${params.id}`);
        if (!response.ok) {
          throw new Error('Error al cargar usuario');
        }
        const data = await response.json();
        setUsuario(data);
        
        // Establecer valores por defecto en el formulario
        form.reset({
          email: data.email,
          password: '',
          nombre: data.nombre,
          apellido: data.apellido,
          role: data.role,
          clienteId: data.clienteId,
        });
      } catch (err) {
        setError('Error al cargar usuario');
        console.error(err);
      }
    };

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
        console.error('Error al cargar clientes:', err);
      }
    };

    fetchUsuario();
    fetchClientes();
  }, [status, session, router, params.id, form]);

  const onSubmit = async (data: UsuarioEditFormValues) => {
    setLoading(true);
    setError(null);

    // Si el rol es ADMIN, eliminar el clienteId
    if (data.role === 'ADMIN') {
      data.clienteId = null;
    }

    // Si la contraseña está vacía, eliminarla del objeto para no actualizarla
    if (!data.password) {
      delete data.password;
    }

    try {
      const response = await fetch(`/api/usuarios/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar usuario');
      }

      router.push('/usuarios');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al actualizar usuario');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !usuario) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Editar Usuario</h1>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <Form form={form} onSubmit={onSubmit}>
        <div className="space-y-4">
          <FormField
            name="email"
            label="Email"
            required
          >
            <Input type="email" placeholder="correo@ejemplo.com" />
          </FormField>

          <FormField
            name="password"
            label="Contraseña"
          >
            <Input 
              type="password" 
              placeholder="Dejar en blanco para mantener la actual" 
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="nombre"
              label="Nombre"
              required
            >
              <Input placeholder="Nombre" />
            </FormField>

            <FormField
              name="apellido"
              label="Apellido"
              required
            >
              <Input placeholder="Apellido" />
            </FormField>
          </div>

          <FormField
            name="role"
            label="Rol"
            required
          >
            <Select>
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </FormField>

          {watchRole === 'USER' && (
            <FormField
              name="clienteId"
              label="Cliente Asociado"
            >
              <Select>
                <option value="">Seleccione un cliente (opcional)</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {`${cliente.nombre} ${cliente.apellido}`}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/usuarios')}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}