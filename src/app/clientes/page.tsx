'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Cliente {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string | null;
  zona: string;
  activo: boolean;
}

interface UserWithRole {
  role: 'ADMIN' | 'USUARIO';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar si el usuario es admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user && (session.user as UserWithRole).role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await fetch('/api/clientes');
        if (!response.ok) {
          throw new Error('Error al cargar clientes');
        }
        const data = await response.json();
        setClientes(data);
      } catch (err) {
        setError('Error al cargar los clientes');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated' && session?.user && (session.user as UserWithRole).role === 'ADMIN') {
      fetchClientes();
    }
  }, [status, session]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;

    try {
      const response = await fetch(`/api/clientes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar cliente');
      }

      // Actualizar la lista de clientes
      setClientes(clientes.filter((cliente) => cliente.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar cliente');
      }
      console.error(err);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return <div className="text-center py-10 bg-gray-50 rounded-md">Cargando...</div>;
  }

  if (status === 'authenticated' && session?.user && (session.user as UserWithRole).role !== 'ADMIN') {
    return null; // Redirigiendo...
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
        <Link href="/clientes/nuevo">
          <Button variant="primary">Nuevo Cliente</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {clientes.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-gray-50 rounded-md">
          No hay clientes registrados
        </div>
      ) : (
        <Table
          headers={[
            'Nombre',
            'Dirección',
            'Teléfono',
            'Email',
            'Zona',
            'Estado',
            'Acciones',
          ]}
        >
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell>{cliente.nombre}</TableCell>
              <TableCell>{cliente.direccion}</TableCell>
              <TableCell>{cliente.telefono}</TableCell>
              <TableCell>{cliente.email || '-'}</TableCell>
              <TableCell>{cliente.zona}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${cliente.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {cliente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/clientes/${cliente.id}`}>
                    <Button variant="secondary" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(cliente.id)}
                    aria-label="Eliminar cliente"
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}