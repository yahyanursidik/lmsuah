export function getOAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const baseURL = env.BETTER_AUTH_URL || env.URL || undefined;
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return { baseURL, clientId, clientSecret, googleEnabled: Boolean(clientId && clientSecret) };
}
