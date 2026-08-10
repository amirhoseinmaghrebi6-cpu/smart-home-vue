const TOKEN_KEY = 'sh_auth_token'

export function setAuthToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}
