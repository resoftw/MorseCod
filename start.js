// Production launcher: defaults to port 3500, overridable via PORT env.
// Set ORIGIN to the public URL when behind a reverse proxy, e.g.
//   ORIGIN=https://example.com node start.js
process.env.PORT ||= '3500';
import('./build/index.js');
