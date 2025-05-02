import QueryProvider from "@/providers/QueryProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "애매한이날",
	description: "과연 선물을 받을 수 있을까?!",
	openGraph: {
		title: "애매한이날",
		description: "과연 선물을 받을 수 있을까?!",
		images: ["/img_gift.png"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<QueryProvider>
					<section className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-blue-100 p-4">
						<div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8 relative">
							{children}
						</div>
					</section>
					<Toaster richColors />
				</QueryProvider>
			</body>
			<Script
				src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js"
				integrity="sha384-dok87au0gKqJdxs7msEdBPNnKSRT+/mhTVzq+qOhcL464zXwvcrpjeWvyj1kCdq6"
				crossOrigin="anonymous"
				strategy="afterInteractive"
			/>
		</html>
	);
}
