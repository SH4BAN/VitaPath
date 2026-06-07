import { app } from "./app.js";
import { env } from "./config/env.js";
import { attachRealtime } from "./realtime.js";

const port = env.port;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`SAFE backend running on http://0.0.0.0:${port}`);
});

attachRealtime(server, app);
