const jwt = require('jsonwebtoken');
const User = require('../../infrastructure/database/models/User');
exports.authenticate = async (req, res, next) => {
 try {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Please sign in.' });
  const token = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'civicconnect', audience: 'civicconnect-web' });
  req.user = await User.findById(token.sub);
  if (!req.user) return res.status(401).json({ message: 'Please sign in again.' });
  next();
 } catch { res.status(401).json({ message: 'Your session is invalid or expired.' }); }
};
exports.protectRole = roles => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'This action is not permitted for your role.' });
