export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { auth } = await import("@/lib/firebase");
  const user = auth.currentUser;
  
  if (!user) throw new Error("Not authenticated");
  
  const token = await user.getIdToken(true); // force refresh if expired
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  return fetch(`${backendUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    },
  });
}
