const ytmusicService = require("../services/ytmusic.service");

async function test() {
  try {
    console.log("--- Testing YTMusic Search ---");
    const results = await ytmusicService.search("Never gonna give you up");
    console.log("Found", results.length, "results");
    console.log(JSON.stringify(results.slice(0, 3), null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

test();
