const express = require('express');
const router  = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const { title, artist } = req.query;
    if (!title || !artist) return res.status(400).json({ error: 'Missing title or artist' });
    res.json({ message: 'lyrics route OK', title, artist });
  } catch (err) { next(err); }
});
module.exports = router;
