function buildHeaders(corsHeaders = {}, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...(options.extraHeaders || {}),
  };

  if (options.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }

  return headers;
}

export function jsonBody(payload, options = {}) {
  return new Response(JSON.stringify(payload), {
    status: options.status || 200,
    headers: buildHeaders(options.corsHeaders, options),
  });
}

export function jsonOk(payload, options = {}) {
  return jsonBody(payload, options);
}

export function jsonRaw(rawJson, options = {}) {
  const body = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson);
  return new Response(body, {
    status: options.status || 200,
    headers: buildHeaders(options.corsHeaders, options),
  });
}

export function jsonError(message, options = {}) {
  const body = {
    error: message,
  };

  if (options.code) body.code = options.code;
  if (options.details !== undefined) body.details = options.details;

  return new Response(JSON.stringify(body), {
    status: options.status || 500,
    headers: buildHeaders(options.corsHeaders, options),
  });
}

export function empty(status = 204, corsHeaders = {}, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}
