export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Dalam produksi, ganti '*' dengan URL spesifik (allowlist)
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export function handleCors(httpMethod: string) {
  if (httpMethod === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null; // Lanjutkan request
}
