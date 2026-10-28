const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../../infrastructure/database/models/User');
const passwords = require('../../core/password');
const { fail } = require('../../core/rules');
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
router.post('/register', wrap(async (req,res) => {
 const { email, password } = req.body;
 if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw fail('Provide a valid email.');
 if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw fail('Password must contain 12 to 128 characters.');
 const user = await User.create({ email: email.trim().toLowerCase(), passwordHash: await passwords.hash(password), role: 'Citizen' });
 res.status(201).json({ message: 'Account created. Please sign in.', id: user.id });
}));
router.post('/login', wrap(async (req,res) => {
 const { email, password } = req.body;
 if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) throw fail('Invalid email or password.',401);
 const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
 if (!user || !await passwords.verify(password, user.passwordHash)) throw fail('Invalid email or password.',401);
 const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: '1h', algorithm: 'HS256', issuer: 'civicconnect', audience: 'civicconnect-web' });
 res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}));
module.exports = router;
