"use client";

import { useIffyQuery } from "@/hooks/query.hooks";
import useKakao from "@/hooks/useKakao";
import useIffyStore from "@/store/zustand";
import type { Iffy } from "@/types/iffy.types";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { RiKakaoTalkFill } from "react-icons/ri";
import { toast } from "sonner";
import SparkleStars from "../common/SparkleStars";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

function Result() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleShareToKakao } = useKakao();
  const { setRefetchCount } = useIffyStore();

  const id = searchParams.get("id");

  const {
    data: iffyFinal,
    isLoading,
    isError,
    error,
  } = useIffyQuery({ id: id || "" });

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
    <div className="h-auto">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <SparkleStars />
          <h2 className="text-2xl font-bold text-purple-800 tracking-tight flex items-center gap-2">
            {iffyFinal?.humor}
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative w-[80svw] h-[80svw] max-w-[500px] max-h-[500px] rounded-md">
            <Skeleton className="absolute top-0 left-0 w-full h-full" />
            <Image
              src={iffyFinal?.gift_image_url}
              alt="선물 이미지"
              className="object-cover"
              sizes="500px"
              fill
              unoptimized={true}
            />
          </div>
          {iffyFinal?.is_person && (
            <p className="text-lg font-semibold text-blue-500 bg-white/50 w-full text-center rounded-md py-2">
              {iffyFinal?.age}세로 추정돼요!
            </p>
          )}
          <div className="bg-white/50 w-full rounded-md p-5 px-4 space-y-3">
            <div className="text-xl md:text-2xl font-bold text-purple-800 tracking-tight w-full flex items-center">
              <div>
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
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white h-12 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg  cursor-pointer w-full duration-1000"
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
