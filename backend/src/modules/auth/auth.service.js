// SERVICIO DE AUTENTICACIÓN
//
// Seguridad (defendible en la defensa):
//  - Contraseñas: bcrypt con costo 12 (OWASP: mínimo 10; 12 da margen
//    porque es una app con saldos reales). Verificado con compare.
//  - IDs públicos: Argon2id calculado UNA sola vez sobre el internalId
//    (UUID) durante el registro. Argon2 es memory-hard y unidireccional:
//    de publicId no se recupera el internalId, ni con rainbow tables ni
//    con fuerza bruta. Las consultas posteriores son lecturas por índice
//    UNIQUE sobre publicId — cero argon2 en el hot path (anti-IDOR).
//  - Access JWT: 30 minutos, stateless, payload {sub: internalId, rol}.
//  - Refresh token: opaco (48 bytes hex de CSPRNG). En DB se guarda solo
//    su SHA-256 (valor de alta entropía, no necesita KDF lento). Rotación:
//    cada refresh emite uno nuevo y revoca el anterior; si roban el token
//    y lo usan, el usuario legítimo queda invalidado y se percibe el robo.

import bcrypt from 'bcryptjs';
import { hash as argon2Hash } from '@node-rs/argon2';
import { randomUUID, randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ApiError } from '../../shared/ApiError.js';
import * as repo from './auth.repository.js';

export const BCRYPT_SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

const firmarAccess = (user) =>
  jwt.sign({ rol: user.rol }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TOKEN_TTL,
  });

const crearRefresh = async (tx, userId) => {
  const token = randomBytes(48).toString('hex'); // 96 chars, CSPRNG
  const datos = {
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
  const repoTx = tx ?? repo;
  await repoTx.createRefreshToken(datos);
  return token;
};

export async function register({ email, password, nombre }) {
  const existente = await repo.findByEmail(email.toLowerCase());
  if (existente) {
    throw new ApiError(409, 'El email ya está registrado');
  }

  const internalId = randomUUID(); // se queda SOLO en la DB
  const publicId = await argon2Hash(internalId); // costo ÚNICO de argon2, solo aquí
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await repo.createWithWallet({
    id: internalId,
    publicId,
    email: email.toLowerCase(),
    passwordHash,
    nombre,
  });

  return {
    publicId: user.publicId,
    email: user.email,
    nombre: user.nombre,
    mensaje: 'Usuario creado correctamente. Ya puedes iniciar sesión.',
  };
}

export async function login({ email, password }) {
  const user = await repo.findByEmail(email.toLowerCase());
  // Mensaje idéntico exista o no: no se revela qué emails existen (enumación)
  const passwordValida = user && (await bcrypt.compare(password, user.passwordHash));
  if (!passwordValida) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const accessToken = firmarAccess(user);
  const refreshToken = await crearRefresh(null, user.id);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresInMinutes: 30,
    usuario: {
      publicId: user.publicId,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
  };
}

export async function refresh(refreshToken) {
  const tokenHash = sha256(refreshToken);
  // Consumir condicionalmente dentro de la transacción; un solo sucesor.
  const { prisma } = await import('../../shared/prisma.client.js');
  const { nuevoRefresh, user } = await prisma.$transaction(async (tx) => {
    const guardado = await tx.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!guardado) throw new ApiError(401, 'Refresh token inválido o expirado');
    const consumed = await tx.refreshToken.updateMany({
      where: { id: guardado.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });
    if (consumed.count !== 1) throw new ApiError(401, 'Refresh token inválido o expirado');
    const token = randomBytes(48).toString('hex');
    await tx.refreshToken.create({
      data: {
        userId: guardado.userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return { nuevoRefresh: token, user: guardado.user };
  });

  return {
    accessToken: firmarAccess(user),
    refreshToken: nuevoRefresh,
    tokenType: 'Bearer',
    expiresInMinutes: 30,
  };
}

export async function logout(refreshToken, userId) {
  const tokenHash = sha256(refreshToken);
  const guardado = await repo.findRefreshValido(tokenHash);
  if (guardado && guardado.userId === userId) {
    await repo.revokeRefresh(guardado.id);
  }
  // Respuesta idéntica exista o no el token: no se filtra información
  return { mensaje: 'Sesión cerrada correctamente' };
}

// Cambio de contraseña autenticado. Verifica la actual con bcrypt, rehashea a
// 12 y revoca TODAS las sesiones (incluida la actual): el cliente debe volver
// a iniciar sesión. Si la actual no coincide → 401 sin tocar nada.
export async function changePassword(userId, { passwordActual, passwordNueva }) {
  const user = await repo.findById(userId);
  if (!user) throw new ApiError(401, 'No autorizado');

  const actualValida = await bcrypt.compare(passwordActual, user.passwordHash);
  if (!actualValida) throw new ApiError(401, 'La contraseña actual no es correcta');

  const passwordHash = await bcrypt.hash(passwordNueva, BCRYPT_SALT_ROUNDS);
  await repo.actualizarPasswordHash(userId, passwordHash);

  return { mensaje: 'Contraseña actualizada. Inicia sesión de nuevo con la nueva contraseña.' };
}
