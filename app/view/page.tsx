"use client";
import type { ClientMessage, ServerMessage } from "@/types";
import { useEffect, useRef, useState } from "react";

const Home = () => {
	const peerConnection = useRef<RTCPeerConnection>();
	const video = useRef<HTMLVideoElement>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const webSocket = useRef<WebSocket>();
	const [peer, setPeer] = useState<string>();
	const [offer, setOffer] = useState<{
		description: RTCSessionDescriptionInit;
		user: string;
	}>();

	useEffect(
		() => () => {
			webSocket.current?.close();
			peerConnection.current?.close();
		},
		[]
	);
	return peer == null ? (
		<form
			className="mx-auto flex flex-col"
			onSubmit={(e) => {
				setPeer("");
				e.preventDefault();
				const username = (e.currentTarget[0] as HTMLInputElement).value;

				webSocket.current = new WebSocket(
					`ws://${location.hostname}:8080/view?username=${username}`
				);
				webSocket.current.addEventListener(
					"message",
					async (message: MessageEvent<Blob | string>) => {
						const data: ServerMessage = JSON.parse(
							typeof message.data === "string"
								? message.data
								: await message.data.text()
						);

						console.log("received message", data);
						if (data.type === "offer") {
							setOffer(data.data);
							dialog.current?.showModal();
						}
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
	) : (
		<div>
			<dialog
				ref={dialog}
				className="text-center p-4 flex flex-col bg-zinc-700 bg-opacity-95 w-96 rounded-lg text-white text-2xl"
			>
				{offer?.user ?? ""} wants to share the screen with you
				<div className="mx-auto">
					<button
						autoFocus
						className="py-2 px-4 transition select-none bg-green-500 bg-opacity-50 mx-4 rounded-md mt-6 hover:scale-105 focus:outline active:scale-100"
						onClick={async () => {
							dialog.current?.close();
							if (!offer) return;
							peerConnection.current = new RTCPeerConnection();
							peerConnection.current.addEventListener(
								"icecandidate",
								(event) => {
									console.log("sending ice candidate...");
									if (event.candidate)
										webSocket.current?.send(
											JSON.stringify({
												type: "candidate",
												data: event.candidate,
											} satisfies ClientMessage)
										);
								}
							);
							peerConnection.current.addEventListener("track", (event) => {
								console.log("stream received!");
								if (video.current) [video.current.srcObject] = event.streams;
							});
							await peerConnection.current.setRemoteDescription(
								new RTCSessionDescription(offer.description)
							);
							const description = await peerConnection.current.createAnswer();

							await peerConnection.current.setLocalDescription(description);
							webSocket.current?.send(
								JSON.stringify({
									type: "answer",
									data: { description, user: offer.user },
								} satisfies ClientMessage)
							);
							setPeer(offer.user);
						}}
					>
						Accept
					</button>
					<button
						className="py-2 px-4 transition select-none bg-red-500 bg-opacity-50 mx-4 rounded-md mt-4 hover:scale-105 focus:outline active:scale-100"
						onClick={() => {
							dialog.current?.close();
						}}
					>
						Decline
					</button>
				</div>
			</dialog>
			<span>
				{peer ? `${peer} is streaming` : "Awaiting for connection..."}
			</span>
			<video
				autoPlay
				ref={video}
				onDoubleClick={() => {
					video.current?.requestFullscreen().catch(console.error);
				}}
			/>
		</div>
	);
};

export default Home;
