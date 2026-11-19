# Salary management frontend

React and Vite frontend for the salary API. Requires Node.js 20.19+ or 22.12+ and npm.

1. Set up PostgreSQL and start the backend on port 3000 using [the backend instructions](../backend/README.md).
2. From this directory run:

   ```sh
   npm install
   npm run dev
   ```

3. Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

During development Vite forwards `/api` requests to `http://localhost:3000`. To use a different API in a built deployment, set `VITE_API_BASE_URL` at build time (for example, `https://example.com/api`) and configure the backend's `CORS_ORIGIN` for the frontend origin. Without that variable the built frontend sends requests to `/api` on its own origin, so the hosting server must route that path to the backend. Never expose the demo API with real salary data: it does not implement authentication or authorization.

Run `npm test` for the component tests and `npm run build` for the production bundle. Salary inputs accept amounts in major currency units with up to two decimal places; the API uses minor units.
