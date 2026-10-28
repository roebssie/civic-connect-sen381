const mongoose = require('mongoose');
const CivicIssue = require('../../infrastructure/database/models/CivicIssue');
const { issueDTO, transition, overdue, categories, transitions, fail } = require('../../core/rules');
function scope(user) { return user.role === 'Citizen' ? { requester: user._id } : user.role === 'Staff' ? { category: { $in: user.categories } } : {}; }
function present(issue) { const value = issue.toObject ? issue.toObject() : issue; return { ...value, overdue: overdue(value.createdAt, value.status) }; }
async function find(req) {
 if (!mongoose.isValidObjectId(req.params.id)) throw fail('Request not found.',404);
 const issue = await CivicIssue.findOne({ _id: req.params.id, ...scope(req.user) });
 if (!issue) throw fail('Request not found.',404);
 return issue;
}
exports.createIssue = async (req,res) => {
 const issue = await CivicIssue.create({ ...issueDTO(req.body), requester: req.user._id, history: [{ status: 'New', actor: req.user._id }] });
 res.status(201).json({ success: true, data: present(issue) });
};
exports.listIssues = async (req,res) => {
 const query = scope(req.user);
 for (const [key, allowed] of [['category',categories], ['status',Object.keys(transitions)]]) {
  if (req.query[key]) { if (typeof req.query[key] !== 'string' || !allowed.includes(req.query[key])) throw fail('Invalid filter.'); query.$and = [...(query.$and || []), { [key]: req.query[key] }]; }
 }
 if (req.query.from) { if (typeof req.query.from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.query.from) || Number.isNaN(Date.parse(req.query.from))) throw fail('Invalid submitted date.'); query.createdAt = { $gte: new Date(req.query.from) }; }
 if (req.query.search) { if (typeof req.query.search !== 'string' || req.query.search.length > 100) throw fail('Invalid search.'); query.description = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }; }
 const page = Number(req.query.page || 1);
 if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw fail('Invalid page.');
 const sort = req.query.sort === 'oldest' ? 1 : -1;
 const [data,total] = await Promise.all([CivicIssue.find(query).sort({ createdAt: sort, _id: sort }).skip((page-1)*50).limit(50).lean(), CivicIssue.countDocuments(query)]);
 res.json({ data: data.map(present), total, page });
};
exports.details = async (req,res) => res.json({ data: present(await find(req)) });
exports.updateIssue = async (req,res) => {
 const issue = await find(req);
 if (!Number.isInteger(req.body.version) || req.body.version !== issue.__v) throw fail('This request changed. Refresh before updating.',409);
 if (issue.status === 'Closed') throw fail('Closed requests cannot be changed.',409);
 if (req.user.role === 'Staff' && issue.assignee && String(issue.assignee) !== req.user.id) throw fail('This request belongs to another staff member.',403);
 const { status, note, priority } = req.body;
 if (note !== undefined && (typeof note !== 'string' || !note.trim() || note.length > 2000)) throw fail('A note must contain 1 to 2000 characters.');
 if (priority !== undefined) { if (!['Low','Normal','High'].includes(priority)) throw fail('Invalid priority.'); issue.priority = priority; }
 if (status !== undefined) {
  transition(issue.status,status,note);
  if (status === 'Assigned') issue.assignee = req.user._id;
  issue.status = status;
  issue.history.push({ status, actor: req.user._id });
  issue.notifications.push({ status });
 }
 if (note) issue.notes.push({ text: note.trim(), actor: req.user._id });
 if (!status && !note && !priority) throw fail('No update supplied.');
 await issue.save();
 res.json({ data: present(issue) });
};
exports.summary = async (req,res) => {
 const data = await CivicIssue.find({},'status category createdAt').lean();
 const result = { total: data.length, open: 0, overdue: 0, resolved: 0, closed: 0, categories: {} };
 for (const item of data) { if (item.status === 'Resolved') result.resolved++; else if (item.status === 'Closed') result.closed++; else result.open++; if (overdue(item.createdAt,item.status)) result.overdue++; result.categories[item.category] = (result.categories[item.category] || 0) + 1; }
 res.json({ data: result });
};
