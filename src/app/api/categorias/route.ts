import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de categoría
const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});

// GET - Obtener todas las categorías
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const categorias = await db.categoria.findMany({
      orderBy: {
        nombre: 'asc',
      },
      include: {
        precios: {
          where: {
            activo: true,
          },
          orderBy: {
            fechaInicio: 'desc',
          },
        },
      },
    });

    return NextResponse.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva categoría
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
    const validatedData = categoriaSchema.parse(body);

    // Verificar si ya existe una categoría con el mismo nombre
    const categoriaExistente = await db.categoria.findUnique({
      where: {
        nombre: validatedData.nombre,
      },
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este nombre' },
        { status: 400 }
      );
    }

    const categoria = await db.categoria.create({
      data: validatedData,
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    );
  }
}