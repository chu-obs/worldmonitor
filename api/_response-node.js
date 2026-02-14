function applyHeaders(res, headers = {}) {
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      res.setHeader(key, value);
    }
  }
}

export function nodeEmpty(res, status = 204, headers = {}) {
  applyHeaders(res, headers);
  return res.status(status).end();
}

export function nodeSend(res, body, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(options.extraHeaders || {}),
  };
  if (options.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }
  applyHeaders(res, headers);
  return res.status(options.status || 200).send(body);
}

export function nodeJson(res, payload, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(options.extraHeaders || {}),
  };
  if (options.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }
  applyHeaders(res, headers);
  return res.status(options.status || 200).json(payload);
}

export function nodeError(res, message, options = {}) {
  const body = {
    error: message,
  };

  if (options.code) body.code = options.code;
  if (options.details !== undefined) body.details = options.details;

  return nodeJson(res, body, {
    status: options.status || 500,
    headers: options.headers,
    cacheControl: options.cacheControl,
  });
}
