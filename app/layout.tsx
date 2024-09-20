import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "tailwindcss/tailwind.css";
import "./globals.css";

const description = "Share your screen directly from the browser!";
const name = "Screen Share";

export const metadata: Metadata = {
	applicationName: name,
	authors: [{ name: "D Trombett", url: "https://github.com/DTrombett" }],
	creator: "D Trombett",
	description,
	generator: "Next.js",
	icons: "/favicon.ico",
	keywords: ["react", "nextjs", "screen-share"],
	metadataBase: new URL("http://localhost:3002"),
	openGraph: {
		type: "website",
		countryName: "Italy",
		description,
		locale: "it",
		siteName: name,
		title: name,
		url: "http://localhost:3002",
		images: "/preview.png",
	},
	publisher: "DTrombett",
	title: name,
	twitter: {
		card: "summary_large_image",
		description,
		images: "/preview.png",
		creator: "@dtrombett",
		title: name,
	},
};

export const viewport: Viewport = { themeColor: "#27272A" };

const RootLayout = async ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => (
	<html lang="it">
		<body
			className={`flex flex-col min-h-screen text-white bg-zinc-800 py-8 px-4`}
		>
			<h1 className="text-6xl text-center font-bold mb-8">Screen Share</h1>
			<Suspense>{children}</Suspense>
		</body>
	</html>
);

export default RootLayout;
