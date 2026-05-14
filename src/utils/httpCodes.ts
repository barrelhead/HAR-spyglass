export interface HttpCodeInfo {
  name: string;
  description: string;
}

export const HTTP_CODES: Record<number, HttpCodeInfo> = {
  // 2xx — Success
  200: { name: 'OK', description: 'Request succeeded. The response body contains the requested data.' },
  201: { name: 'Created', description: 'Request succeeded and a new resource was created.' },
  202: { name: 'Accepted', description: 'Request accepted but processing is not yet complete.' },
  204: { name: 'No Content', description: 'Request succeeded but there is no response body.' },
  206: { name: 'Partial Content', description: 'Partial resource returned, typically in response to a range request.' },

  // 3xx — Redirection
  301: { name: 'Moved Permanently', description: 'Resource has been permanently moved to a new URL. Clients should update bookmarks.' },
  302: { name: 'Found', description: 'Resource temporarily redirected to a different URL.' },
  303: { name: 'See Other', description: 'Redirect to a different URL using a GET request (common after POST).' },
  304: { name: 'Not Modified', description: 'Resource has not changed since the last request. Browser uses its cached version — no body returned.' },
  307: { name: 'Temporary Redirect', description: 'Temporarily redirected to a different URL. The original HTTP method must be preserved.' },
  308: { name: 'Permanent Redirect', description: 'Permanently redirected. The original HTTP method must be preserved.' },

  // 4xx — Client Errors
  400: { name: 'Bad Request', description: 'The server could not understand the request due to invalid syntax or missing parameters.' },
  401: { name: 'Unauthorized', description: 'Authentication is required. The client must provide valid credentials.' },
  403: { name: 'Forbidden', description: 'The server understood the request but refuses to authorize it. Credentials will not help.' },
  404: { name: 'Not Found', description: 'The requested resource could not be found. The URL may be wrong or the resource deleted.' },
  405: { name: 'Method Not Allowed', description: 'The HTTP method is not supported for this endpoint.' },
  408: { name: 'Request Timeout', description: 'The server timed out waiting for the client to send the request.' },
  409: { name: 'Conflict', description: 'The request conflicts with the current state of the resource (e.g., duplicate entry).' },
  410: { name: 'Gone', description: 'The resource has been permanently deleted and will not be available again.' },
  413: { name: 'Content Too Large', description: 'The request body exceeds the server\'s size limit.' },
  415: { name: 'Unsupported Media Type', description: 'The server does not support the request\'s content format.' },
  422: { name: 'Unprocessable Content', description: 'The request was well-formed but failed validation (common in REST APIs).' },
  429: { name: 'Too Many Requests', description: 'Rate limit exceeded. The client has sent too many requests in a given time window.' },

  // 5xx — Server Errors
  500: { name: 'Internal Server Error', description: 'An unexpected error occurred on the server. Check server logs for details.' },
  501: { name: 'Not Implemented', description: 'The server does not support the functionality required by this request.' },
  502: { name: 'Bad Gateway', description: 'The server, acting as a gateway, received an invalid response from an upstream server.' },
  503: { name: 'Service Unavailable', description: 'The server is temporarily unable to handle the request — it may be overloaded or down for maintenance.' },
  504: { name: 'Gateway Timeout', description: 'The server, acting as a gateway, did not receive a timely response from an upstream server.' },
  505: { name: 'HTTP Version Not Supported', description: 'The server does not support the HTTP version used in the request.' },
};

export function getHttpCodeInfo(status: number): HttpCodeInfo | undefined {
  return HTTP_CODES[status];
}
