export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Retoro Backend API</h1>
      <p>Backend API for Retoro iOS app.</p>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>POST /api/auth/register</code> - Register new user</li>
        <li><code>POST /api/auth/login</code> - Login</li>
        <li><code>POST /api/auth/register/magic-link</code> - Send magic link</li>
        <li><code>GET /api/auth/session</code> - Check session</li>
        <li><code>POST /api/auth/logout</code> - Logout</li>
        <li><code>GET /api/return-items</code> - Get all return items</li>
        <li><code>POST /api/return-items</code> - Create return item</li>
        <li><code>GET /api/return-items/:id</code> - Get return item</li>
        <li><code>PUT /api/return-items/:id</code> - Update return item</li>
        <li><code>PATCH /api/return-items/:id</code> - Mark as returned/kept</li>
        <li><code>DELETE /api/return-items/:id</code> - Delete return item</li>
      </ul>

      <h2>Documentation</h2>
      <p>See <a href="https://github.com/yourorg/retoro-backend">README.md</a> for full API documentation.</p>
    </div>
  );
}
