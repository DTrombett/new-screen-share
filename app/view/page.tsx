"use client";
import { useEffect, useRef, useState } from "react";

const Home = () => {
	const peerConnection = useRef<RTCPeerConnection>();
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const webSocket = useRef<WebSocket>();
	const username = useRef<string>();
	const [offers, setOffers] =
		useState<{ username: string; description: RTCSessionDescriptionInit }[]>();

	useEffect(
		() => () => {
			webSocket.current?.close();
			peerConnection.current?.close();
		},
		[]
	);
	return offers ? (
		<div>
			<div>
				{offers.map((o) => (
					<button
						key={o.username}
						onClick={async () => {
							await peerConnection.current?.setRemoteDescription(
								new RTCSessionDescription(o.description)
							);
							const description = await peerConnection.current?.createAnswer();

							await peerConnection.current?.setLocalDescription(description);
							webSocket.current?.send(
								JSON.stringify({
									type: "answer",
									description,
									username: username.current,
								})
							);
						}}
					>
						{o.username}
					</button>
				))}
			</div>
			<video autoPlay ref={remoteVideoRef} />
		</div>
	) : (
		<form
			className="mx-auto flex flex-col"
			onSubmit={(e) => {
				e.preventDefault();
				setOffers([]);
				username.current = (e.currentTarget[0] as HTMLInputElement).value;
				webSocket.current = new WebSocket(
					`ws://localhost:8080/view?username=${username.current}`
				);
				peerConnection.current = new RTCPeerConnection();
				peerConnection.current.addEventListener("icecandidate", (event) => {
					if (event.candidate)
						webSocket.current?.send(
							JSON.stringify({
								type: "ice-candidate",
								candidate: event.candidate,
								username: username.current,
							})
						);
				});
				peerConnection.current.addEventListener("track", (event) => {
					if (remoteVideoRef.current)
						[remoteVideoRef.current.srcObject] = event.streams;
				});
				webSocket.current.addEventListener(
					"message",
					async (message: MessageEvent<Blob | string>) => {
						const data: {
							type: string;
							description: RTCSessionDescriptionInit;
							username: string;
						} = JSON.parse(
							typeof message.data === "string"
								? message.data
								: await message.data.text()
						);

						if (data.type === "offer")
							setOffers((oldOffers) => {
								const newOffers = oldOffers?.slice();
								const old = newOffers?.find(
									({ username: user }) => user === data.username
								);

								if (old) old.description = data.description;
								else
									newOffers?.push({
										username: data.username,
										description: data.description,
									});
								return newOffers;
							});
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
