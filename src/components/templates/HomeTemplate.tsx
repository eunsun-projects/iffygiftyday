"use client";

import type { LoadingState } from "@/types/iffy.types";
import { Sparkles, Stars } from "lucide-react";
import { useState } from "react";
import UploadModal from "../common/UploadModal";

function HomeTemplate() {
	const [loading, setLoading] = useState<LoadingState>({
		open: false,
		isError: false,
	});

	return (
		<>
			<div className="flex flex-col items-center justify-center">
				{/* Floating elements for AI aesthetic */}
				<div className="absolute top-0 left-0 animate-pulse opacity-70">
					<Sparkles className="h-8 w-8 text-purple-400" />
				</div>
				<div className="absolute bottom-0 right-0 animate-pulse opacity-70">
					<Stars className="h-8 w-8 text-purple-400" />
				</div>

				{/* Main content */}
				<div className="text-center space-y-2">
					<h1 className="text-4xl md:text-6xl font-extrabold text-purple-900 tracking-tighter pb-3">
						애매한이날
					</h1>
					<h2 className="text-xl md:text-2xl font-bold text-purple-800 tracking-tight mt-2">
						어린이날 선물 받아도 될까?
					</h2>
					<p className="text-sm text-purple-600 opacity-80 mt-1">
						AI가 당신의 선물 자격을 분석해 드립니다
					</p>
				</div>

				{/* Gift animation container */}
				<div className="relative w-64 h-64 my-8">
					<div className="absolute inset-0 bg-purple-200 rounded-full opacity-20 animate-pulse" />
					<div className="absolute inset-4 bg-purple-300 rounded-full opacity-10 animate-pulse animation-delay-700" />
					<div className="relative flex items-center justify-center h-full">
						<img src={"/img_gift.png"} alt="선물 이미지" className="w-1/2" />
					</div>
				</div>

				{/* Action button */}
				<UploadModal loading={loading} setLoading={setLoading} />

				{/* AI processing indicator */}
				<div className="flex items-center gap-2 text-xs text-purple-600 mt-4">
					<div className="flex space-x-1 mt-0.5">
						<div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
						<div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
						<div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-400" />
					</div>
					<span>AI 분석 준비 완료</span>
				</div>
			</div>
		</>
	);
}

export default HomeTemplate;
