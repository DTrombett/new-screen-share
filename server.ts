/* eslint-disable no-console */
import next from "next";
import { createServer } from "node:http";
import { env } from "node:process";
import { parse } from "node:url";
import Websocket from "ws";

const port = parseInt(env.PORT ?? "3002");
const dev = env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const wss = new Websocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
	ws.on("message", (message) => {
		for (const client of wss.clients)
			if (client !== ws && client.readyState === WebSocket.OPEN)
				client.send(message);
	});
});
app
	.prepare()
	.then(() => {
		createServer((req, res) =>
			handle(req, res, parse(req.url!, true)).catch(console.error)
		).listen(port);
		console.log(
			`> Server listening at http://localhost:${port} as ${
				dev ? "development" : env.NODE_ENV
			}`
		);
	})
	.catch(console.error);
