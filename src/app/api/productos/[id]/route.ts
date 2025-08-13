import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de producto
const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional().nullable(),
  imagen: z.string().optional().nullable(),
  activo: z.boolean().default(true),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
});

// GET - Obtener un producto por ID
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
    
    const producto = await db.producto.findUnique({
      where: {
        id: id,
      },
      include: {
        categoria: true,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un producto por ID
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
    
    // Verificar si el producto existe
    const productoExistente = await db.producto.findUnique({
      where: {
        id: id,
      },
    });

    if (!productoExistente) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = productoSchema.parse(body);

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

    const productoActualizado = await db.producto.update({
      where: {
        id: id,
      },
      data: validatedData,
      include: {
        categoria: true,
      },
    });

    return NextResponse.json(productoActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar producto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto por ID
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
    
    // Verificar si el producto existe
    const productoExistente = await db.producto.findUnique({
      where: {
        id: id,
      },
    });

    if (!productoExistente) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el producto tiene pedidos asociados
    const pedidosAsociados = await db.pedidoItem.findFirst({
      where: {
        productoId: id,
      },
    });

    if (pedidosAsociados) {
      return NextResponse.json(
        { error: 'No se puede eliminar el producto porque tiene pedidos asociados' },
        { status: 400 }
      );
    }

    // Eliminar el producto
    await db.producto.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json(
      { message: 'Producto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}