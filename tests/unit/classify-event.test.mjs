import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/classify-event.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function restoreEnvVar(name, value) {
  if (typeof value === 'string') {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}

test('classify-event returns fallback when GROQ key is missing', async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  delete process.env.GROQ_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const request = new Request('https://example.com/api/classify-event?title=Sample');
    const response = await handler(request);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.fallback, true);
  } finally {
    restoreEnvVar('GROQ_API_KEY', prevGroq);
    restoreEnvVar('UPSTASH_REDIS_REST_URL', prevRedisUrl);
    restoreEnvVar('UPSTASH_REDIS_REST_TOKEN', prevRedisToken);
  }
});

test('classify-event falls back when upstream model call fails', async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const prevFetch = globalThis.fetch;

  process.env.GROQ_API_KEY = 'test-key';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  globalThis.fetch = async () => jsonResponse({ error: 'upstream failed' }, 502);

  try {
    const request = new Request('https://example.com/api/classify-event?title=Sample');
    const response = await handler(request);
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.fallback, true);
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnvVar('GROQ_API_KEY', prevGroq);
    restoreEnvVar('UPSTASH_REDIS_REST_URL', prevRedisUrl);
    restoreEnvVar('UPSTASH_REDIS_REST_TOKEN', prevRedisToken);
  }
});

test('classify-event falls back on invalid LLM JSON payload', async () => {
  const prevGroq = process.env.GROQ_API_KEY;
  const prevRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const prevFetch = globalThis.fetch;

  process.env.GROQ_API_KEY = 'test-key';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  globalThis.fetch = async () => jsonResponse({
    choices: [
      { message: { content: 'not-json' } },
    ],
  });

  try {
    const request = new Request('https://example.com/api/classify-event?title=Sample');
    const response = await handler(request);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.fallback, true);
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnvVar('GROQ_API_KEY', prevGroq);
    restoreEnvVar('UPSTASH_REDIS_REST_URL', prevRedisUrl);
    restoreEnvVar('UPSTASH_REDIS_REST_TOKEN', prevRedisToken);
  }
});
