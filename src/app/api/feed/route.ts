import { startWatcher, getEvents } from "@/lib/watcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await startWatcher();

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  // SSE mode for live streaming
  if (mode === "sse") {
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        let lastCheck = Date.now();

        const interval = setInterval(() => {
          if (closed) {
            clearInterval(interval);
            return;
          }

          const events = getEvents(lastCheck);
          lastCheck = Date.now();

          if (events.length > 0) {
            const data = `data: ${JSON.stringify(events)}\n\n`;
            try {
              controller.enqueue(encoder.encode(data));
            } catch {
              closed = true;
              clearInterval(interval);
            }
          } else {
            // Send heartbeat every poll to keep connection alive
            try {
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch {
              closed = true;
              clearInterval(interval);
            }
          }
        }, 2000);

        // Clean up on abort
        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Regular poll mode
  const since = url.searchParams.get("since");
  const events = getEvents(since ? parseInt(since, 10) : undefined);
  return Response.json(events);
}
