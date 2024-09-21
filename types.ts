import WebSocket from "ws";

export enum Role {
	Viewer,
	Streamer,
}
export declare class CustomWebSocket extends WebSocket {
	username?: string;
	isAlive?: boolean;
	role?: Role;
}
export type Message =
	| {
			type: "users";
			data: string[];
	  }
	| {
			type: "newUser";
			data: string;
	  };
