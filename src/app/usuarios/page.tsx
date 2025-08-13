'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Table, TableRow, TableCell } from '@/components/ui/Table';

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
  cliente: Cliente | null;
}

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Cargar usuarios
    const fetchUsuarios = async () => {
      try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) {
          throw new Error('Error al cargar usuarios');
        }
        const data = await response.json();
        setUsuarios(data);
      } catch (err) {
        setError('Error al cargar usuarios');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [status, session, router]);

  const handleEliminar = async (id: string) => {
    // Evitar eliminar el usuario actual
    if (session?.user.id === id) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }

    if (!confirm('¿Está seguro de eliminar este usuario?')) return;

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      // Actualizar la lista de usuarios
      setUsuarios(usuarios.filter(usuario => usuario.id !== id));
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error al eliminar usuario');
      }
      console.error(err);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="p-4">Cargando...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Link href="/usuarios/nuevo">
          <Button>Nuevo Usuario</Button>
        </Link>
      </div>

      {usuarios.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <Table
          headers={[
            'Email',
            'Nombre',
            'Rol',
            'Cliente Asociado',
            'Acciones',
          ]}
        >
          {usuarios.map((usuario) => (
            <TableRow key={usuario.id}>
              <TableCell>{usuario.email}</TableCell>
              <TableCell>{`${usuario.nombre} ${usuario.apellido}`}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${usuario.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {usuario.role}
                </span>
              </TableCell>
              <TableCell>
                {usuario.cliente ? (
                  `${usuario.cliente.nombre} ${usuario.cliente.apellido}`
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/usuarios/${usuario.id}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminar(usuario.id)}
                    disabled={session?.user.id === usuario.id}
                    title={session?.user.id === usuario.id ? 'No puedes eliminar tu propio usuario' : ''}
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