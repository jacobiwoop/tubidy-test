const express = require('express');
const router  = express.Router();
router.get('/:id', async (req, res, next) => {
  try { res.json({ message: 'stream route OK', id: req.params.id }); }
  catch (err) { next(err); }
});
module.exports = router;
