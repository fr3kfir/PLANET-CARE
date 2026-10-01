export async function diagnose({ dataUrl, location, notes, knownSpecies }) {
  const [, mediaType, image] = dataUrl.match(/^data:(image\/[\w+]+);base64,(.*)$/) || [];
  const r = await fetch('/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mediaType, location, notes, knownSpecies }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `שגיאת שרת (${r.status})`);
  return body;
}

// Plant-expert chat: streams the reply text, calling onDelta with each chunk.
export async function chatStream({ messages, plants, signal, onDelta }) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, plants }),
    signal,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `שגיאת שרת (${r.status})`);
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}
