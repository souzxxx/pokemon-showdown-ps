type Auth0Config = {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
  usersApiBaseUrl: string;
};

export const auth0Config: Auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? '',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? '',
  redirectUri: import.meta.env.VITE_AUTH0_REDIRECT_URI ?? window.location.origin,
  usersApiBaseUrl: import.meta.env.VITE_USERS_API_BASE_URL ?? 'http://localhost:8000/api/users',
};
