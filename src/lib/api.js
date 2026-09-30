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
