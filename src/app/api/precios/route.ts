import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de precio
const precioSchema = z.object({
  tipo: z.enum(['FABRICA', 'MAYORISTA', 'MINORISTA']),
  valor: z.number().positive('El precio debe ser mayor a 0'),
  fechaInicio: z.string().transform((str) => new Date(str)),
  fechaFin: z.string().optional().nullable().transform((str) => str ? new Date(str) : null),
  activo: z.boolean().default(true),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
});

// GET - Obtener todos los precios
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const precios = await db.precio.findMany({
      orderBy: [
        {
          categoriaId: 'asc',
        },
        {
          tipo: 'asc',
        },
        {
          fechaInicio: 'desc',
        },
      ],
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(precios);
  } catch (error) {
    console.error('Error al obtener precios:', error);
    return NextResponse.json(
      { error: 'Error al obtener precios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo precio
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
    const validatedData = precioSchema.parse(body);

    // Verificar si existe la categoría
    const categoria = await db.categoria.findUnique({
      where: {
        id: validatedData.categoriaId,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 400 }
      );
    }

    // Desactivar precios anteriores del mismo tipo para esta categoría
    if (validatedData.activo) {
      await db.precio.updateMany({
        where: {
          categoriaId: validatedData.categoriaId,
          tipo: validatedData.tipo,
          activo: true,
        },
        data: {
          activo: false,
          fechaFin: new Date(),
        },
      });
    }

    const precio = await db.precio.create({
      data: validatedData,
    });

    return NextResponse.json(precio, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear precio:', error);
    return NextResponse.json(
      { error: 'Error al crear precio' },
      { status: 500 }
    );
  }
}