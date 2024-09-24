import next from "next";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { env } from "node:process";
import { parse, URL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import {
	Role,
	type ClientMessage,
	type CustomWebSocket,
	type ServerMessage,
} from "./types";

const port = parseInt(env.PORT ?? "3002");
const dev = env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const options = {
	cert: readFileSync("./certificate/__dev.trombett.org.pem"),
	key: readFileSync("./certificate/__dev.trombett.org.key"),
};
const server = createServer(options, (req, res) =>
	handle(req, res, parse(req.url!, true)).catch(console.error)
);
const wss = new WebSocketServer<typeof CustomWebSocket>({ noServer: true });
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
	const url = new URL(req.url, "wss://localhost:3002");

	ws.username = url.searchParams.get("username")!;
	if (!ws.username) {
		ws.close(3000);
		return;
	}
	ws.role =
		url.pathname === "/get"
			? Role.Viewer
			: url.pathname === "/stream"
			? Role.Streamer
			: undefined;
	if (ws.role === undefined) {
		ws.close(3004);
		return;
	}
	ws.isAlive = true;
	ws.on("message", (message) => {
		const isArray = Array.isArray(message);
		const size = isArray
			? message.reduce((s, buf) => s + buf.byteLength, 0)
			: message.byteLength;

		if (size > 10_000) {
			ws.close(1009);
			return;
		}
		try {
			const data: ClientMessage = JSON.parse(
				isArray
					? message.reduce((s, buf) => s + buf.toString(), "")
					: // eslint-disable-next-line @typescript-eslint/no-base-to-string
					  message.toString()
			);

			if (data.type === "offer")
				if (ws.role === Role.Streamer && ws.username) {
					for (const client of wss.clients) {
						console.log(client.username);
						if (
							client.username === data.data.user &&
							client.role === Role.Viewer &&
							client.readyState === WebSocket.OPEN
						) {
							client.send(
								JSON.stringify({
									type: "offer",
									data: {
										description: data.data.description,
										user: ws.username,
									},
								} satisfies ServerMessage)
							);
							ws.peer = client.username;
							return;
						}
					}
					ws.send(
						JSON.stringify({
							type: "error",
							data: "User not found!",
						} satisfies ServerMessage)
					);
				} else
					ws.send(
						JSON.stringify({
							type: "error",
							data: "You're not a streamer!",
						} satisfies ServerMessage)
					);
			else if (data.type === "answer")
				if (ws.role === Role.Viewer) {
					for (const client of wss.clients)
						if (
							client.username === data.data.user &&
							client.role === Role.Streamer &&
							client.peer === ws.username &&
							client.readyState === WebSocket.OPEN
						) {
							client.send(
								JSON.stringify({
									type: "answer",
									data: data.data.description,
								} satisfies ServerMessage)
							);
							ws.peer = client.username;
							return;
						}
					ws.send(
						JSON.stringify({
							type: "error",
							data: "Offer not found!",
						} satisfies ServerMessage)
					);
				} else
					ws.send(
						JSON.stringify({
							type: "error",
							data: "You're not a viewer!",
						} satisfies ServerMessage)
					);
			else if (data.type === "candidate")
				if (ws.role === Role.Viewer && ws.peer) {
					for (const client of wss.clients)
						if (
							client.username === ws.peer &&
							client.role === Role.Streamer &&
							client.peer === ws.username &&
							client.readyState === WebSocket.OPEN
						) {
							client.send(
								JSON.stringify({
									type: "candidate",
									data: data.data,
								} satisfies ServerMessage)
							);
							ws.peer = client.username;
							return;
						}
					ws.send(
						JSON.stringify({
							type: "error",
							data: "Peer not found!",
						} satisfies ServerMessage)
					);
				} else
					ws.send(
						JSON.stringify({
							type: "error",
							data: "You're not a viewer or you haven't answered to any offer!",
						} satisfies ServerMessage)
					);
			else
				ws.send(
					JSON.stringify({
						type: "error",
						data: "Unknown message type!",
					} satisfies ServerMessage)
				);
		} catch (err) {
			ws.send(
				JSON.stringify({
					type: "error",
					data: "An unknown error occurred",
				} satisfies ServerMessage)
			);
		}
	})
		.on("error", console.error)
		.on("pong", () => (ws.isAlive = true))
		.once("close", (code, reason) => {
			if (ws.role === Role.Viewer)
				for (const client of wss.clients)
					if (
						client.role === Role.Streamer &&
						client.readyState === WebSocket.OPEN
					)
						client.send(
							JSON.stringify({
								type: "removeUser",
								data: ws.username!,
							} satisfies ServerMessage)
						);
			console.log(
				`${
					ws.username
				} disconnected with close code ${code}, reason: ${reason.toString()}`
			);
		});
	if (ws.role === Role.Streamer) {
		const data: string[] = [];

		for (const client of wss.clients)
			if (client.username && client.role === Role.Viewer)
				data.push(client.username);
		ws.send(JSON.stringify({ type: "users", data } satisfies ServerMessage));
	} else
		for (const client of wss.clients)
			if (
				client.role === Role.Streamer &&
				client.username &&
				client.readyState === WebSocket.OPEN
			)
				client.send(
					JSON.stringify({
						type: "addUser",
						data: ws.username,
					} satisfies ServerMessage)
				);
	ws.send(
		JSON.stringify({
			type: "open",
			data: "Ready!",
		} satisfies ServerMessage)
	);
	console.log(`${ws.username} successfully connected as ${Role[ws.role]}`);
});
void app.prepare().then(() => {
	server.listen(port);
	server.on("upgrade", (request, socket, head) => {
		if (request.url?.startsWith("/_next")) return;
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit("connection", ws, request);
		});
	});
	console.log(
		`> Server listening at https://localhost:${port} as ${
			dev ? "development" : env.NODE_ENV
		}`
	);
});
