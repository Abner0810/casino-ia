import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL es obligatoria'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  CORS_ORIGINS: z.string().default('*'),
  STRIPE_SECRET_KEY: z.string().regex(/^sk_test_/, 'STRIPE_SECRET_KEY debe ser una clave de TEST (sk_test_)').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/, 'STRIPE_WEBHOOK_SECRET debe empezar por whsec_').optional(),
  STRIPE_CURRENCY: z.literal('bob').default('bob'),
  STRIPE_CHECKOUT_BASE_URL: z.string().url('STRIPE_CHECKOUT_BASE_URL debe ser una URL válida').optional(),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && (value.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*') || !value.CORS_ORIGINS.trim())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['CORS_ORIGINS'], message: 'Producción requiere orígenes explícitos' });
  }
  if (value.NODE_ENV === 'production' && !value.STRIPE_SECRET_KEY) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STRIPE_SECRET_KEY'], message: 'Producción requiere STRIPE_SECRET_KEY' });
  }
  if (value.NODE_ENV === 'production' && !value.STRIPE_WEBHOOK_SECRET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STRIPE_WEBHOOK_SECRET'], message: 'Producción requiere STRIPE_WEBHOOK_SECRET' });
  }
  for (const [campo, valor] of [['STRIPE_SECRET_KEY', value.STRIPE_SECRET_KEY], ['STRIPE_WEBHOOK_SECRET', value.STRIPE_WEBHOOK_SECRET]]) {
    if (valor && /^(?:sk|pk|rk)_live_/.test(valor)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: 'Solo se admite modo test: las claves live están prohibidas' });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas. El servidor no puede arrancar:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins:
    parsed.data.CORS_ORIGINS === '*'
      ? '*'
      : parsed.data.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean),
  esProduccion: parsed.data.NODE_ENV === 'production',
};
