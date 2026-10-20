import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import SwaggerParser from '@apidevtools/swagger-parser';
import { contract } from '../scripts/generate-openapi.mjs';

test('OpenAPI es válido y coincide con el generador y configuración de juegos', async () => {
  const saved = JSON.parse(await readFile(new URL('../openapi.json', import.meta.url), 'utf8'));
  assert.deepEqual(saved, contract, 'Regenerar con npm run contract:generate');
  await SwaggerParser.validate(structuredClone(saved));
});
