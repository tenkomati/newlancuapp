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

// GET - Obtener un precio por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const precio = await db.precio.findUnique({
      where: {
        id: id,
      },
      include: {
        categoria: true,
      },
    });

    if (!precio) {
      return NextResponse.json(
        { error: 'Precio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(precio);
  } catch (error) {
    console.error('Error al obtener precio:', error);
    return NextResponse.json(
      { error: 'Error al obtener precio' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un precio por ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Verificar si el precio existe
    const precioExistente = await db.precio.findUnique({
      where: {
        id: id,
      },
    });

    if (!precioExistente) {
      return NextResponse.json(
        { error: 'Precio no encontrado' },
        { status: 404 }
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

    // Si el precio se está activando, desactivar otros precios del mismo tipo para esta categoría
    if (validatedData.activo && (!precioExistente.activo || precioExistente.categoriaId !== validatedData.categoriaId)) {
      await db.precio.updateMany({
        where: {
          categoriaId: validatedData.categoriaId,
          tipo: validatedData.tipo,
          activo: true,
          id: {
            not: id,
          },
        },
        data: {
          activo: false,
          fechaFin: new Date(),
        },
      });
    }

    const precioActualizado = await db.precio.update({
      where: {
        id: id,
      },
      data: validatedData,
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(precioActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar precio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar precio' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un precio por ID
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Verificar si el precio existe
    const precioExistente = await db.precio.findUnique({
      where: {
        id: id,
      },
    });

    if (!precioExistente) {
      return NextResponse.json(
        { error: 'Precio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el precio está siendo utilizado en pedidos
    const pedidosAsociados = await db.pedidoItem.findFirst({
      where: {
        precio: precioExistente.valor,
        pedido: {
          fecha: {
            gte: precioExistente.fechaInicio,
            lte: precioExistente.fechaFin || new Date(2099, 11, 31),
          },
        },
      },
    });

    if (pedidosAsociados) {
      return NextResponse.json(
        { error: 'No se puede eliminar el precio porque está siendo utilizado en pedidos' },
        { status: 400 }
      );
    }

    // Eliminar el precio
    await db.precio.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json(
      { message: 'Precio eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar precio:', error);
    return NextResponse.json(
      { error: 'Error al eliminar precio' },
      { status: 500 }
    );
  }
}