# React + Vite

## Connecting to the backend

The frontend API client uses `http://localhost:5000/api` by default. To use a
different backend, set `VITE_API_URL` in `frontend/.env.local` to the full API
base URL, for example `https://api.example.com/api`.

Set the backend's `CLIENT_URL` environment variable to the frontend origin
(comma-separated origins are supported). The API uses credentialed CORS for
the HttpOnly refresh-token cookie. `AuthProvider` restores the session on
startup and refreshes expired access tokens automatically.

Start the backend from `backend/` and the frontend from `frontend/`; the backend
must have its database and authentication/email environment configured.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
