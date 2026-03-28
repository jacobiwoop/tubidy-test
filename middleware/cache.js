const store = new Map();
const cache = (ttlSeconds = 300) => (req, res, next) => {
  const key = req.originalUrl;
  const cached = store.get(key);
  if (cached && Date.now() - cached.ts < ttlSeconds * 1000) return res.json(cached.data);
  res.sendJSON = res.json.bind(res);
  res.json = (data) => { store.set(key, { data, ts: Date.now() }); res.sendJSON(data); };
  next();
};
module.exports = cache;
