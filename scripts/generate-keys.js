#!/usr/bin/env node
/**
 * AuthSphere — Generate RS256 Key Pair
 * Run: node scripts/generate-keys.js
 * Then paste output into your .env file
 */
const { generateKeyPairSync } = require('crypto');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const escapeKey = (key) => key.replace(/\n/g, '\\n');

console.log('\n✅ RS256 Key Pair Generated\n');
console.log('Add these to your .env file:\n');
console.log(`JWT_PRIVATE_KEY="${escapeKey(privateKey)}"`);
console.log(`\nJWT_PUBLIC_KEY="${escapeKey(publicKey)}"`);
console.log('\n');
