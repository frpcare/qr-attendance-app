// /app/api/scan/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Secret Key
);

export async function POST(req: Request) {
  const { name, type } = await req.json();
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('name', name)
    .eq('date', today)
    .single();

  if (type === 'start') {
    if (existing?.start_time) return NextResponse.json({ message: 'Already started' }, { status: 400 });

    const { error } = await supabase.from('attendance_logs').upsert({
      name,
      date: today,
      start_time: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ message: 'Start time logged' });
  }

  if (type === 'end') {
    if (!existing?.start_time) return NextResponse.json({ message: 'No start time found' }, { status: 400 });
    if (existing?.end_time) return NextResponse.json({ message: 'Already ended' }, { status: 400 });

    const endTime = new Date();
    const startTime = new Date(existing.start_time);
    const hours = Math.round(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * 100) / 100;

    const isFriday = endTime.getDay() === 5; // Friday = 5
    const bonus = isFriday ? 50 : 0;

    const { error } = await supabase.from('attendance_logs').update({
      end_time: endTime.toISOString(),
      total_hours: hours,
      bonus
    }).eq('id', existing.id);

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ message: 'End time & bonus updated' });
  }

  return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
}
