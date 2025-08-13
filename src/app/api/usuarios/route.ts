import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Schema para validación de usuario
const usuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  clienteId: z.string().optional().nullable(),
  activo: z.boolean().default(true),
});

// GET - Obtener todos los usuarios
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuarios = await db.user.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        role: true,
        clienteId: true,
        activo: true,
        cliente: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = usuarioSchema.parse(body);

    // Verificar si el email ya está en uso
    const usuarioExistente = await db.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      );
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

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Crear el usuario
    const usuario = await db.user.create({
      data: {
        nombre: validatedData.nombre,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        clienteId: validatedData.clienteId,
        activo: validatedData.activo,
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

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}