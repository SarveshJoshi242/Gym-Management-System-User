// ═══════════════════════════════════════════════════════════════
//  GymPlus — API Configuration
//  Change the URL below to your Render backend URL after deploying.
//  Example: https://gymplus-api.onrender.com
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080'
  : 'https://gym-management-system-user.onrender.com';

// ── Build the API path used by app.js ────────────────────────
const API = API_BASE_URL + '/api';
