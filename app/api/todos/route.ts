import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeCriticalPath } from '@/lib/critical-path';

const TODO_INCLUDE = {
  dependsOn: { include: { dependency: true } },
  dependedBy: { include: { dependent: true } },
} as const;

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
      include: TODO_INCLUDE,
    });

    const cpmMap = computeCriticalPath(todos);
    const todosWithCPM = todos.map((t) => ({
      ...t,
      cpm: cpmMap.get(t.id) ?? null,
    }));

    return NextResponse.json(todosWithCPM);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate } = await request.json();
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    try {
      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}&per_page=1`,
        { headers: { Authorization: process.env.PEXELS_API_KEY! } }
      );
      const pexelsData = await pexelsRes.json();
      if (pexelsData.photos?.[0]) {
        imageUrl = pexelsData.photos[0].src.medium;
      }
    } catch {
      // Pexels failure should never block todo creation
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        imageUrl,
      },
      include: TODO_INCLUDE,
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}