"use client";
import type { ClientMessage, ServerMessage } from "@/types";
import { useEffect, useRef, useState } from "react";

const Home = () => {
	const peerConnection = useRef<RTCPeerConnection>();
	const webSocket = useRef<WebSocket>();
	const [users, setUsers] = useState<string[]>();

	useEffect(
		() => () => {
			webSocket.current?.close();
			peerConnection.current?.close();
		},
		[]
	);
	return users ? (
		<div>
			<div>
				{users.map((user) => (
					<button
						key={user}
						onClick={async () => {
							peerConnection.current = new RTCPeerConnection();
							const stream = await navigator.mediaDevices.getDisplayMedia({
								video: {
									frameRate: { ideal: 60 },
									height: { ideal: 1080 },
									width: { ideal: 1920 },
								},
								audio: true,
							});

							for (const track of stream.getTracks())
								peerConnection.current.addTrack(track, stream);
							await Promise.all(
								peerConnection.current.getSenders().map(async (sender) => {
									if (sender.track?.kind === "video") {
										const parameters = sender.getParameters();

										parameters.encodings[0] = { maxBitrate: 64_000_000 };
										return sender.setParameters(parameters);
									}
									return null;
								})
							);
							const description = await peerConnection.current.createOffer();

							await peerConnection.current.setLocalDescription(description);
							webSocket.current?.send(
								JSON.stringify({
									type: "offer",
									data: { description, user },
								} satisfies ClientMessage)
							);
						}}
					>
						{user}
					</button>
				))}
			</div>
		</div>
	) : (
		<form
			className="mx-auto flex flex-col"
			onSubmit={async (e) => {
				e.preventDefault();
				setUsers([]);
				webSocket.current = new WebSocket(
					`${location.origin.replace("http", "ws")}/stream?username=${
						(e.currentTarget[0] as HTMLInputElement).value
					}`
				);
				webSocket.current.addEventListener(
					"message",
					async (message: MessageEvent<string | Blob>) => {
						const data: ServerMessage = JSON.parse(
							typeof message.data === "string"
								? message.data
								: await message.data.text()
						);

						console.log("received message", data);
						if (data.type === "users") setUsers(data.data);
						else if (data.type === "addUser")
							setUsers((oldUsers) => [...(oldUsers ?? []), data.data]);
						else if (data.type === "removeUser")
							setUsers((oldUsers) =>
								oldUsers?.filter((user) => user !== data.data)
							);
						else if (data.type === "answer")
							await peerConnection.current?.setRemoteDescription(
								new RTCSessionDescription(data.data)
							);
						else if (data.type === "candidate")
							await peerConnection.current?.addIceCandidate(
								new RTCIceCandidate(data.data)
							);
					}
				);
			}}
		>
			<input
				type="text"
				className="w-fit text-xl px-4 py-2 my-8 bg-zinc-700 bg-opacity-70 outline-none rounded"
				placeholder="Username"
				required
				name="username"
			/>
			<input
				type="submit"
				className="mx-auto cursor-pointer hover:scale-105 active:scale-100 transition w-fit text-2xl px-6 py-4 bg-zinc-700 bg-opacity-70 outline-none rounded-lg"
			/>
		</form>
	);
};

export default Home;
