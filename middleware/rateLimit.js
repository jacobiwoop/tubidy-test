const rateLimit = require('express-rate-limit');
const defaultLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: 'Too many requests.' } });
const searchLimiter  = rateLimit({ windowMs: 60*1000,    max: 20,  message: { error: 'Search rate limit exceeded.' } });
module.exports = { defaultLimiter, searchLimiter };
