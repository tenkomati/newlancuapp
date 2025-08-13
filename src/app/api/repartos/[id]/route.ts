import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de reparto
const repartoSchema = z.object({
  fecha: z.string().transform((str) => new Date(str)),
  zona: z.string().min(1, 'La zona es requerida'),
  estado: z.boolean().default(true),
  observacion: z.string().optional().nullable(),
});

// GET - Obtener un reparto por ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const reparto = await db.reparto.findUnique({
      where: {
        id: params.id,
      },
      include: {
        pedidos: {
          include: {
            cliente: true,
            items: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });

    if (!reparto) {
      return NextResponse.json(
        { error: 'Reparto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(reparto);
  } catch (error) {
    console.error('Error al obtener reparto:', error);
    return NextResponse.json(
      { error: 'Error al obtener reparto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un reparto por ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el reparto existe
    const repartoExistente = await db.reparto.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!repartoExistente) {
      return NextResponse.json(
        { error: 'Reparto no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = repartoSchema.parse(body);

    // Verificar si ya existe un reparto para la misma zona y fecha (si se cambia la fecha o zona)
    if (validatedData.fecha.toDateString() !== repartoExistente.fecha.toDateString() || 
        validatedData.zona !== repartoExistente.zona) {
      
      const fechaInicio = new Date(validatedData.fecha);
      fechaInicio.setHours(0, 0, 0, 0); // Inicio del día
      
      const fechaFin = new Date(validatedData.fecha);
      fechaFin.setHours(23, 59, 59, 999); // Fin del día

      const repartoExistenteEnFechaYZona = await db.reparto.findFirst({
        where: {
          zona: validatedData.zona,
          fecha: {
            gte: fechaInicio,
            lte: fechaFin,
          },
          id: {
            not: params.id,
          },
        },
      });

      if (repartoExistenteEnFechaYZona) {
        return NextResponse.json(
          { error: 'Ya existe un reparto para esta zona y fecha' },
          { status: 400 }
        );
      }
    }

    // Actualizar el reparto
    const repartoActualizado = await db.reparto.update({
      where: {
        id: params.id,
      },
      data: validatedData,
    });

    // Si se cambió la zona, actualizar los pedidos asignados a este reparto
    if (validatedData.zona !== repartoExistente.zona) {
      // Desasignar pedidos que no corresponden a la nueva zona
      await db.pedido.updateMany({
        where: {
          repartoId: params.id,
          cliente: {
            zona: {
              not: validatedData.zona,
            },
          },
        },
        data: {
          repartoId: null,
        },
      });

      // Asignar pedidos pendientes de la nueva zona que no tengan reparto asignado
      const clientesEnNuevaZona = await db.cliente.findMany({
        where: {
          zona: validatedData.zona,
        },
        select: {
          id: true,
        },
      });

      const clienteIds = clientesEnNuevaZona.map(cliente => cliente.id);

      if (clienteIds.length > 0) {
        await db.pedido.updateMany({
          where: {
            clienteId: {
              in: clienteIds,
            },
            repartoId: null,
            estado: 'PENDIENTE',
          },
          data: {
            repartoId: params.id,
          },
        });
      }
    }

    // Obtener el reparto actualizado con los pedidos
    const repartoConPedidos = await db.reparto.findUnique({
      where: {
        id: params.id,
      },
      include: {
        pedidos: {
          include: {
            cliente: true,
            items: {
              include: {
                producto: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(repartoConPedidos);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar reparto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar reparto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un reparto por ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el reparto existe
    const repartoExistente = await db.reparto.findUnique({
      where: {
        id: params.id,
      },
      include: {
        pedidos: true,
      },
    });

    if (!repartoExistente) {
      return NextResponse.json(
        { error: 'Reparto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el reparto tiene pedidos entregados
    const pedidosEntregados = repartoExistente.pedidos.some(pedido => pedido.estado === 'ENTREGADO');

    if (pedidosEntregados) {
      return NextResponse.json(
        { error: 'No se puede eliminar el reparto porque tiene pedidos entregados' },
        { status: 400 }
      );
    }

    // Desasignar los pedidos asociados a este reparto
    await db.pedido.updateMany({
      where: {
        repartoId: params.id,
      },
      data: {
        repartoId: null,
      },
    });

    // Eliminar el reparto
    await db.reparto.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json(
      { message: 'Reparto eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar reparto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar reparto' },
      { status: 500 }
    );
  }
}