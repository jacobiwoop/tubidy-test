const express = require('express');
const router  = express.Router();
const { searchLimiter } = require('../middleware/rateLimit');
const cache   = require('../middleware/cache');
const tubidyService = require('../services/tubidy.service');
const mappingService = require('../services/mapping.service');

router.get('/', searchLimiter, cache(300), async (req, res, next) => {
  try {
    const { q, page = 1, all = 'false' } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter: q' });
    const result = await tubidyService.search(q, {
      page: Number(page),
      allPages: all === 'true',
      maxPages: 10,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/play', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter: q' });
    const result = await mappingService.getDirectLinkByQuery(q);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
