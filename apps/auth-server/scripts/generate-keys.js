const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const keysDir = path.resolve(__dirname, '..', 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

fs.mkdirSync(keysDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

fs.writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8' });
fs.writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8' });

console.log(`Generated:\n- ${privateKeyPath}\n- ${publicKeyPath}`);
