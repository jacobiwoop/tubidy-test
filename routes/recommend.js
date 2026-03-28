const express = require('express');
const router  = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const { artist, track } = req.query;
    if (!artist || !track) return res.status(400).json({ error: 'Missing artist or track' });
    res.json({ message: 'recommend route OK', artist, track });
  } catch (err) { next(err); }
});
module.exports = router;
