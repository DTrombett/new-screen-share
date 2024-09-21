/* eslint-disable no-console */
import next from "next";
import { createServer } from "node:http";
import { env } from "node:process";
import { parse, URL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { Role, type CustomWebSocket } from "./types";

const port = parseInt(env.PORT ?? "3002");
const dev = env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const server = createServer((req, res) =>
	handle(req, res, parse(req.url!, true)).catch(console.error)
);
const wss = new WebSocketServer<typeof CustomWebSocket>({ port: 8080 });
const interval = setInterval(() => {
	for (const ws of wss.clients) {
		if (ws.isAlive === false) {
			ws.terminate();
			return;
		}
		ws.isAlive = false;
		ws.ping();
	}
}, 10_000);

wss.on("close", () => {
	clearInterval(interval);
});
wss.on("connection", (ws, req) => {
	if (!req.url) {
		ws.terminate();
		return;
	}
	const url = new URL(req.url, "http://localhost:8080");

	ws.username = url.searchParams.get("username")!;
	if (!ws.username) {
		ws.close(3000);
		return;
	}
	ws.role =
		url.pathname === "/view"
			? Role.Viewer
			: url.pathname === "/stream"
			? Role.Streamer
			: undefined;
	if (ws.role === undefined) {
		ws.close(3004);
		return;
	}
	ws.isAlive = true;
	ws.on("message", (message, binary) => {
		const isArray = Array.isArray(message);
		const size = isArray
			? message.reduce((s, buf) => s + buf.byteLength, 0)
			: message.byteLength;

		if (size > 10_000) {
			ws.close(1009);
			return;
		}
		try {
			const data: object = JSON.parse(
				isArray
					? message.reduce((s, buf) => s + buf.toString(), "")
					: // eslint-disable-next-line @typescript-eslint/no-base-to-string
					  message.toString()
			);

			if (
				"type" in data &&
				typeof data.type === "string" &&
				["offer", "answer", "ice-candidate"].includes(data.type)
			)
				for (const client of wss.clients)
					if (client !== ws && client.readyState === WebSocket.OPEN)
						client.send(message, { binary });
		} catch (err) {}
	});
	ws.on("error", console.error);
	ws.on("pong", () => (ws.isAlive = true));
	const users: string[] = [];

	for (const client of wss.clients)
		if (client.role !== ws.role) {
			users.push(client.username!);
			client.send(
				JSON.stringify({
					type: "newUser",
					data: client.username,
				})
			);
		}
	ws.send(JSON.stringify({ type: "users", data: users }));
});
void app.prepare().then(() => {
	server.listen(port);
	console.log(
		`> Server listening at http://localhost:${port} as ${
			dev ? "development" : env.NODE_ENV
		}`
	);
});
