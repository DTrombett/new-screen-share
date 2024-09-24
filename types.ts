import WebSocket from "ws";

export enum Role {
	Viewer,
	Streamer,
}
export declare class CustomWebSocket extends WebSocket {
	username?: string;
	isAlive?: boolean;
	role?: Role;
	peer?: string;
}
export type ServerMessage =
	| {
			type: "users";
			data: string[];
	  }
	| {
			type: "removeUser";
			data: string;
	  }
	| {
			type: "addUser";
			data: string;
	  }
	| {
			type: "offer";
			data: { description: RTCSessionDescriptionInit; user: string };
	  }
	| {
			type: "answer";
			data: RTCSessionDescriptionInit;
	  }
	| {
			type: "candidate";
			data: RTCIceCandidate;
	  }
	| { type: "error"; data: string }
	| { type: "open"; data: string };
export type ClientMessage =
	| {
			type: "offer";
			data: { description: RTCSessionDescriptionInit; user: string };
	  }
	| {
			type: "answer";
			data: { description: RTCSessionDescriptionInit; user: string };
	  }
	| {
			type: "candidate";
			data: RTCIceCandidate;
	  };
