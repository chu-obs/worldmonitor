export const config = { runtime: 'edge' };
import { jsonBody } from './_response.js';

export default async function handler() {
  return jsonBody({ error: 'Not found' }, {
    status: 404,
    cacheControl: 'no-store',
  });
}
