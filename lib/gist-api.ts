export async function fetchGistContent(urlOrId: string): Promise<string> {
  const id = urlOrId.includes('github.com') ? urlOrId.split('/').pop()! : urlOrId;
  const res = await fetch(`https://api.github.com/gists/${id}`);
  if (!res.ok) throw new Error('Gist not found');
  const gist = await res.json();
  const files: Record<string, { content?: string }> = gist.files;
  const firstFile = Object.values(files)[0];
  return firstFile?.content || '';
}