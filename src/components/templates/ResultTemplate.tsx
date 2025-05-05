"use client";

import { useIffyQuery } from "@/hooks/query.hooks";
import useKakao from "@/hooks/useKakao";
import useIffyStore from "@/store/zustand";
import type { Iffy } from "@/types/iffy.types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { RiKakaoTalkFill } from "react-icons/ri";
import { toast } from "sonner";
import SparkleStars from "../common/SparkleStars";
import { Button } from "../ui/button";

// 이미지 로딩 상태 타입
type ImageStatus = "loading" | "loaded" | "error";

function Result() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleShareToKakao } = useKakao();
  const { setRefetchCount } = useIffyStore();
  const [imageStatus, setImageStatus] = useState<ImageStatus>("loading");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const id = searchParams.get("id");

  useEffect(() => {
    if (!id) {
      router.push("/");
    }
  }, [id, router]);

  const {
    data: iffyFinal,
    isLoading,
    isError,
    error,
    refetch,
  } = useIffyQuery({ id: id as string });

  const handleReturnHome = () => {
    setRefetchCount(0);
    router.push("/");
  };

  useEffect(() => {
    if (!isLoading && (!id || !iffyFinal)) {
      console.log(
        "Redirecting to / because jobId or iffyFinal is not available.",
        { jobId: id, isLoading, hasIffyFinal: !!iffyFinal }
      );
      toast.error("결과를 불러올 수 없습니다. 다시 시도해주세요.");
      router.push("/");
    }
  }, [id, iffyFinal, isLoading, router]);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching final result:", error);
      const errorMessage =
        (error as Error)?.message || "결과를 불러오는 중 오류가 발생했습니다.";
      toast.error(errorMessage);
      router.push("/");
    } else if (iffyFinal?.is_error) {
      toast.error(iffyFinal?.commentary || "처리 중 오류가 발생했습니다.");
      router.push("/");
    }
  }, [isError, error, iffyFinal, router]);

  useEffect(() => {
    const imageUrl = iffyFinal?.gift_image_url;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (imageUrl) {
      setImageStatus("loading");
      const preloader = new Image();

      const timer = setTimeout(() => {
        if (imageStatus === "loading") {
          console.error(
            `Image load timed out after 3 seconds for URL: ${imageUrl}`
          );
          setImageStatus("error");
          refetch();
        }
      }, 3000);
      timeoutRef.current = timer;

      preloader.onload = () => {
        console.log("Image preloaded successfully:", imageUrl);
        clearTimeout(timer);
        timeoutRef.current = null;
        setImageStatus("loaded");
      };

      preloader.onerror = (err) => {
        console.error("Image preload error:", err, imageUrl);
        clearTimeout(timer);
        timeoutRef.current = null;
        setImageStatus("error");
        refetch();
      };

      preloader.src = imageUrl;

      return () => {
        console.log("Cleaning up image preloader for:", imageUrl);
        clearTimeout(timer);
        preloader.onload = null;
        preloader.onerror = null;
      };
    }
    setImageStatus("error");
  }, [iffyFinal?.gift_image_url, refetch, imageStatus]);

  if (isLoading || !id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SparkleStars className="absolute top-0 left-0" />
        <p className="text-white z-10">결과를 불러오는 중...</p>
      </div>
    );
  }

  if (!iffyFinal) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SparkleStars className="absolute top-0 left-0" />
        <p className="text-white z-10">결과 데이터 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="h-auto p-1">
      <div className="flex flex-col gap-5">
        <div className="flex flex-row space-y-2 items-center justify-center gap-2 p-1">
          <SparkleStars />
          <h2 className="text-2xl font-bold text-purple-800 tracking-tight flex items-center gap-2 whitespace-pre-wrap break-words break-keep">
            {iffyFinal?.humor}
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative w-[80svw] h-[80svw] max-w-[500px] max-h-[500px] rounded-md bg-gray-200">
            {imageStatus === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse">
                이미지 로딩 중...
              </div>
            )}
            {imageStatus === "loaded" && iffyFinal?.gift_image_url && (
              <img
                key={iffyFinal.gift_image_url}
                src={iffyFinal.gift_image_url}
                alt="선물 이미지"
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  console.error(
                    "Final img tag error (should not happen often):",
                    e
                  );
                  setImageStatus("error");
                }}
              />
            )}
            {imageStatus === "error" && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500">
                이미지 표시 불가
              </div>
            )}
          </div>
          {iffyFinal?.is_person && (
            <p className="text-lg font-semibold text-blue-500 bg-white/50 w-full text-center rounded-md py-2">
              {iffyFinal?.age}세로 추정돼요!
            </p>
          )}
          <div className="bg-white/50 w-full rounded-md p-5 px-4 space-y-3">
            <div className="text-xl md:text-2xl font-bold text-purple-800 tracking-tight w-full flex items-center">
              <div className="whitespace-pre-wrap break-words break-keep text-center">
                <span>
                  {iffyFinal?.brand} {iffyFinal?.gift_name}
                </span>
                을 선물해 드릴게요.
              </div>
            </div>
            <p className="text-base font-semibold text-purple-950">
              {iffyFinal?.commentary}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          {!iffyFinal?.is_error && (
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white h-12 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg  cursor-pointer w-full duration-1000 font-bold"
              onClick={() =>
                handleShareToKakao({ iffyData: iffyFinal as Iffy })
              }
            >
              공유하기
              <RiKakaoTalkFill height={24} width={24} className="size-6" />
            </Button>
          )}

          <div className="flex gap-2 w-full text-center">
            {iffyFinal?.link && (
              <Link
                target="_blank"
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center justify-center flex-1"
                href={iffyFinal.link}
              >
                직접 사러가기
              </Link>
            )}
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 gap-2 text-sm cursor-pointer flex-1"
              onClick={handleReturnHome}
            >
              다시하기
            </Button>
          </div>
          <Link
            href="https://thesmc.co.kr"
            target="_blank"
            className="text-xs underline text-gray-500 cursor-pointer"
          >
            우리가 궁금하다면?
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResultTemplate() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Result />
    </Suspense>
  );
}

export default ResultTemplate;
