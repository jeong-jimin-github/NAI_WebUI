function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export async function deriveAccessKey(email, password) {
  const { argon2id, blake2b } = await import(
    'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/index.esm.js'
  );
  const preSalt = `${password.slice(0, 6)}${email}novelai_data_access_key`;
  const saltHex = await blake2b(preSalt, 128);
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), pair => parseInt(pair, 16));
  const digest = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 1953,
    hashLength: 64,
    outputType: 'binary',
  });
  return bytesToBase64(digest)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
    .slice(0, 64);
}
