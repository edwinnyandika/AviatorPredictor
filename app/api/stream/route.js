// app/api/stream/route.js
// Server-Sent Events — push live data to dashboard without polling
import { store } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add this client to broadcast list
      store.subscribers.push(controller);

      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"time":${Date.now()}}\n\n`)
      );

      // Keep-alive ping every 25 seconds
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 25000);
    },
    cancel(controller) {
      // Remove from subscribers on disconnect
      store.subscribers = store.subscribers.filter(c => c !== controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}
