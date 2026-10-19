import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const target = new URL('../.env', import.meta.url);
const password = randomBytes(24).toString('hex');
const contents = `# Generado localmente; no subir al repositorio.
POSTGRES_USER=casino
POSTGRES_DB=casino
POSTGRES_PASSWORD=${password}
JWT_ACCESS_SECRET=${randomBytes(48).toString('hex')}
JWT_REFRESH_SECRET=${randomBytes(48).toString('hex')}
CORS_ORIGINS=http://localhost:5173
API_PORT=3000
`;
try {
  writeFileSync(target, contents, { flag: 'wx', mode: 0o600 });
  console.log('backend/.env creado con credenciales aleatorias. Ya puedes ejecutar npm run docker:up.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.error('Ya existe backend/.env: no se sobrescribió. Añade las variables Docker siguiendo docker/.env.example.');
  process.exitCode = 1;
}
