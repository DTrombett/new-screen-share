"use client";
import { useRef } from "react";

const Home = () => {
	const peerConnection = useRef<RTCPeerConnection>();
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const webSocket = useRef<WebSocket>();

	return (
		<div>
			<h1>Screen Share</h1>
			<video autoPlay ref={remoteVideoRef} />
			<button
				onClick={async () => {
					webSocket.current = new WebSocket("ws://localhost:8080");
					peerConnection.current = new RTCPeerConnection();
					peerConnection.current.addEventListener("icecandidate", (event) => {
						if (event.candidate)
							webSocket.current?.send(
								JSON.stringify({
									type: "ice-candidate",
									candidate: event.candidate,
								})
							);
					});
					webSocket.current.addEventListener(
						"message",
						async (message: MessageEvent<Blob>) => {
							const data: {
								type: string;
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
						JSON.stringify({ type: "offer", description })
					);
				}}
			>
				Share screen
			</button>
			<button
				onClick={() => {
					webSocket.current = new WebSocket("ws://localhost:8080");
					peerConnection.current = new RTCPeerConnection({
						iceServers: [
							{ urls: "stun:stun.l.google.com:19302" },
							{ urls: "stun:stun.cloudflare.com:3478" },
						],
					});
					peerConnection.current.addEventListener("icecandidate", (event) => {
						if (event.candidate)
							webSocket.current?.send(
								JSON.stringify({
									type: "ice-candidate",
									candidate: event.candidate,
								})
							);
					});
					peerConnection.current.addEventListener("track", (event) => {
						if (remoteVideoRef.current)
							[remoteVideoRef.current.srcObject] = event.streams;
					});
					webSocket.current.addEventListener(
						"message",
						async (message: MessageEvent<Blob>) => {
							const data: {
								type: string;
								description: RTCSessionDescriptionInit;
								candidate: RTCIceCandidate;
							} = JSON.parse(await message.data.text());

							if (data.type === "offer") {
								await peerConnection.current?.setRemoteDescription(
									new RTCSessionDescription(data.description)
								);
								const description =
									await peerConnection.current?.createAnswer();

								await peerConnection.current?.setLocalDescription(description);
								webSocket.current?.send(
									JSON.stringify({ type: "answer", description })
								);
							} else if (data.type === "ice-candidate")
								await peerConnection.current?.addIceCandidate(
									new RTCIceCandidate(data.candidate)
								);
						}
					);
				}}
			>
				View screen
			</button>
		</div>
	);
};

export default Home;
