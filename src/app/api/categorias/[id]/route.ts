import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de categoría
const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
});

// GET - Obtener una categoría por ID
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
    const categoria = await db.categoria.findUnique({
      where: {
        id: id,
      },
      include: {
        precios: {
          where: {
            activo: true,
          },
          orderBy: {
            tipo: 'asc',
          },
        },
        productos: {
          where: {
            activo: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        },
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(categoria);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    return NextResponse.json(
      { error: 'Error al obtener categoría' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una categoría por ID
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
    
    // Verificar si la categoría existe
    const categoriaExistente = await db.categoria.findUnique({
      where: {
        id: id,
      },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = categoriaSchema.parse(body);

    // Verificar si el nombre ya está en uso por otra categoría
    if (validatedData.nombre !== categoriaExistente.nombre) {
      const nombreEnUso = await db.categoria.findFirst({
        where: {
          nombre: validatedData.nombre,
          id: {
            not: id,
          },
        },
      });

      if (nombreEnUso) {
        return NextResponse.json(
          { error: 'El nombre ya está en uso por otra categoría' },
          { status: 400 }
        );
      }
    }

    // Actualizar la categoría
    const categoriaActualizada = await db.categoria.update({
      where: {
        id: id,
      },
      data: validatedData,
      include: {
        precios: {
          where: {
            activo: true,
          },
          orderBy: {
            tipo: 'asc',
          },
        },
        productos: {
          where: {
            activo: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        },
      },
    });

    return NextResponse.json(categoriaActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una categoría por ID
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
    
    // Verificar si la categoría existe
    const categoriaExistente = await db.categoria.findUnique({
      where: {
        id: id,
      },
      include: {
        productos: true,
        precios: true,
      },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si la categoría tiene productos o precios asociados
    if (categoriaExistente.productos.length > 0 || categoriaExistente.precios.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la categoría porque tiene productos o precios asociados' },
        { status: 400 }
      );
    }

    // Eliminar la categoría
    await db.categoria.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json(
      { message: 'Categoría eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return NextResponse.json(
      { error: 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}