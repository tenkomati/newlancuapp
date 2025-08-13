import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Schema para validación de usuario (actualización)
const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  clienteId: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});

// GET - Obtener un usuario por ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuario = await db.user.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        clienteId: true,
        activo: true,
        cliente: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un usuario por ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el usuario existe
    const usuarioExistente = await db.user.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = usuarioUpdateSchema.parse(body);

    // Verificar si el email ya está en uso por otro usuario
    if (validatedData.email !== usuarioExistente.email) {
      const emailEnUso = await db.user.findUnique({
        where: {
          email: validatedData.email,
        },
      });

      if (emailEnUso) {
        return NextResponse.json(
          { error: 'El email ya está en uso por otro usuario' },
          { status: 400 }
        );
      }
    }

    // Verificar si el cliente existe (si se proporciona)
    if (validatedData.clienteId) {
      const cliente = await db.cliente.findUnique({
        where: {
          id: validatedData.clienteId,
        },
      });

      if (!cliente) {
        return NextResponse.json(
          { error: 'El cliente seleccionado no existe' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualización
    const updateData = {
      nombre: validatedData.nombre,
      email: validatedData.email,
      role: validatedData.role,
      clienteId: validatedData.clienteId,
      activo: validatedData.activo,
    };

    // Actualizar contraseña si se proporciona
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    // Actualizar el usuario
    const usuarioActualizado = await db.user.update({
      where: {
        id: params.id,
      },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        clienteId: true,
        activo: true,
        cliente: true,
      },
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un usuario por ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el usuario existe
    const usuarioExistente = await db.user.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar el propio usuario
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'No puede eliminar su propio usuario' },
        { status: 400 }
      );
    }

    // Eliminar el usuario
    await db.user.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json(
      { message: 'Usuario eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}