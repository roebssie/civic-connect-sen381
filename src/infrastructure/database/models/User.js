const mongoose = require('mongoose');
const { categories } = require('../../../core/rules');
const schema = new mongoose.Schema({
 email: { type: String, required: true, unique: true, lowercase: true, trim: true },
 passwordHash: { type: String, required: true, select: false },
 role: { type: String, enum: ['Citizen', 'Staff', 'Municipal Admin'], default: 'Citizen' },
 categories: [{ type: String, enum: categories }]
}, { timestamps: true });
module.exports = mongoose.model('User', schema);
