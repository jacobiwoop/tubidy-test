const express = require("express");
const axios = require("axios");

const router = express.Router();

const CLOAK_RUNNER_URL =
  process.env.CLOAK_RUNNER_URL || "http://127.0.0.1:8765";

router.get("/health", async (req, res, next) => {
  try {
    const response = await axios.get(`${CLOAK_RUNNER_URL}/health`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

router.post("/chosic-focus-cookie", async (req, res, next) => {
  try {
    const timeout = Number(req.body?.timeout || 180);
    const response = await axios.post(
      `${CLOAK_RUNNER_URL}/chosic/focus-cookie`,
      { timeout },
      { timeout: Math.max(timeout + 30, 60) * 1000 },
    );
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
