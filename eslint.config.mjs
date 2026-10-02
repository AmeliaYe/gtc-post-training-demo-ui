import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    'node_modules/**',
    // Versioned press-demo snapshot; verified independently of the React app.
    'public/healthcare/r01/**',
    'healthcare-demo/**',
    '.next/**',
    '.vercel/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);
