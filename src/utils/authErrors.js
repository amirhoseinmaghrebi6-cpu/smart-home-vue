export function resolveAuthError(error, t) {
  if (!error.response) {
    return t.errNetwork
  }

  const { status, data } = error.response
  const serverMsg = typeof data === 'string' ? data : data?.message

  if (status === 429) return t.err429
  if (status === 401) return serverMsg || t.err401
  if (status === 404) return serverMsg || t.err404
  if (status === 400) return serverMsg || t.err400
  if (status === 500) return serverMsg || t.errServer
  if (serverMsg) return serverMsg

  return t.errDefault
}
