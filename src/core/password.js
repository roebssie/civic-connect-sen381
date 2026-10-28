const { randomBytes, scrypt: rawScrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(rawScrypt);
async function hash(password) { const salt = randomBytes(16).toString('hex'); return salt + ':' + (await scrypt(password, salt, 64)).toString('hex'); }
async function verify(password, stored) { const [salt, value] = stored.split(':'); const actual = await scrypt(password, salt, 64); const expected = Buffer.from(value, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
module.exports = { hash, verify };
