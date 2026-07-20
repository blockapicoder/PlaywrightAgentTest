import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3200);
const server = app.listen(port, () => console.log(`Generation Test Studio listening on http://localhost:${port}`));
function shutdown(): void { server.close(() => process.exit(0)); }
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
