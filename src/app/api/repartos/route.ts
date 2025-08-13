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

// GET - Obtener todos los repartos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const incluirPasados = searchParams.get('incluirPasados') === 'true';
    const zona = searchParams.get('zona');

    const where: any = {};
    
    // Filtrar por fecha si no se incluyen pasados
    if (!incluirPasados) {
      const fechaActual = new Date();
      fechaActual.setHours(0, 0, 0, 0); // Inicio del día actual
      where.fecha = {
        gte: fechaActual,
      };
    }

    // Filtrar por zona si se especifica
    if (zona) {
      where.zona = zona;
    }

    const repartos = await db.reparto.findMany({
      where,
      orderBy: {
        fecha: 'asc',
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

    return NextResponse.json(repartos);
  } catch (error) {
    console.error('Error al obtener repartos:', error);
    return NextResponse.json(
      { error: 'Error al obtener repartos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo reparto
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
    const validatedData = repartoSchema.parse(body);

    // Verificar si ya existe un reparto para la misma zona y fecha
    const fechaInicio = new Date(validatedData.fecha);
    fechaInicio.setHours(0, 0, 0, 0); // Inicio del día
    
    const fechaFin = new Date(validatedData.fecha);
    fechaFin.setHours(23, 59, 59, 999); // Fin del día

    const repartoExistente = await db.reparto.findFirst({
      where: {
        zona: validatedData.zona,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
    });

    if (repartoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un reparto para esta zona y fecha' },
        { status: 400 }
      );
    }

    // Crear el reparto
    const reparto = await db.reparto.create({
      data: validatedData,
    });

    // Buscar pedidos pendientes para esta zona que no tengan reparto asignado
    // y asignarlos a este nuevo reparto
    const clientesEnZona = await db.cliente.findMany({
      where: {
        zona: validatedData.zona,
      },
      select: {
        id: true,
      },
    });

    const clienteIds = clientesEnZona.map(cliente => cliente.id);

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
          repartoId: reparto.id,
        },
      });
    }

    // Obtener el reparto con los pedidos asignados
    const repartoConPedidos = await db.reparto.findUnique({
      where: {
        id: reparto.id,
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

    return NextResponse.json(repartoConPedidos, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear reparto:', error);
    return NextResponse.json(
      { error: 'Error al crear reparto' },
      { status: 500 }
    );
  }
}