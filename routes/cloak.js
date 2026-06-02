const express = require("express");
const axios = require("axios");

const router = express.Router();

const CLOAK_RUNNER_URL = process.env.CLOAK_RUNNER_URL || "";

function getRunnerUrl() {
  if (!CLOAK_RUNNER_URL) {
    const err = new Error("CLOAK_RUNNER_URL is not configured");
    err.status = 503;
    throw err;
  }
  return CLOAK_RUNNER_URL.replace(/\/+$/, "");
}

router.get("/health", async (req, res, next) => {
  try {
    const runnerUrl = getRunnerUrl();
    const response = await axios.get(`${runnerUrl}/health`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

router.post("/chosic-focus-cookie", async (req, res, next) => {
  try {
    const runnerUrl = getRunnerUrl();
    const timeout = Number(req.body?.timeout || 180);
    const response = await axios.post(
      `${runnerUrl}/chosic/focus-cookie`,
      { timeout },
      { timeout: Math.max(timeout + 30, 60) * 1000 },
    );
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
