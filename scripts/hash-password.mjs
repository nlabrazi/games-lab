import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run auth:hash -- "votre-mot-de-passe"');
  process.exit(1);
}

const scryptAsync = promisify(scrypt);
const salt = randomBytes(16).toString("base64url");
const derivedKey = await scryptAsync(password, salt, 64);

console.log(`scrypt:${salt}:${derivedKey.toString("base64url")}`);
