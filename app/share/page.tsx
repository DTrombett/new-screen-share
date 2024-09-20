"use client";
import { useEffect, useRef, useState } from "react";

const Home = () => {
	const peerConnection = useRef<RTCPeerConnection>();
	const webSocket = useRef<WebSocket>();
	const [username, setUsername] = useState<string>();

	useEffect(
		() => () => {
			webSocket.current?.close();
			peerConnection.current?.close();
		},
		[]
	);
	return username ? (
		<span className="text-center">Sharing your screen...</span>
	) : (
		<form
			className="mx-auto flex flex-col"
			onSubmit={async (e) => {
				const newUsername = (e.currentTarget[0] as HTMLInputElement).value;

				e.preventDefault();
				setUsername(newUsername);
				webSocket.current = new WebSocket("ws://localhost:8080");
				peerConnection.current = new RTCPeerConnection();
				webSocket.current.addEventListener(
					"message",
					async (message: MessageEvent<Blob>) => {
						const data: {
							type: string;
							username: string;
							description: RTCSessionDescriptionInit;
							candidate: RTCIceCandidate;
						} = JSON.parse(await message.data.text());

						if (data.type === "answer")
							await peerConnection.current?.setRemoteDescription(
								new RTCSessionDescription(data.description)
							);
						else if (data.type === "ice-candidate")
							await peerConnection.current?.addIceCandidate(
								new RTCIceCandidate(data.candidate)
							);
					}
				);
				const stream = await navigator.mediaDevices.getDisplayMedia({
					video: {
						displaySurface: { ideal: "monitor" },
					},
				});

				for (const track of stream.getTracks())
					peerConnection.current.addTrack(track, stream);
				const description = await peerConnection.current.createOffer();

				await peerConnection.current.setLocalDescription(description);
				webSocket.current.send(
					JSON.stringify({ type: "offer", description, username: newUsername })
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
