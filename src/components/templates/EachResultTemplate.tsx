"use client";

import { useIffyQuery } from "@/hooks/query.hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import SparkleStars from "../common/SparkleStars";
import { Button } from "../ui/button";

interface EachResultTemplateProps {
  id: string;
}

function EachResultTemplate({ id }: EachResultTemplateProps) {
  const router = useRouter();
  const { data: iffy, isLoading } = useIffyQuery({ id });

  const handleGoToLink = () => {
    if (iffy?.link) {
      window.open(iffy.link, "_blank");
    } else {
      alert("링크가 없습니다.");
    }
  };

  useEffect(() => {
    if (iffy?.is_error) {
      toast.error(iffy?.commentary);
      router.push("/");
    }
  }, [iffy, router]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <SparkleStars className="absolute top-0 left-0" />
      </div>
    );

  return (
    <div className="h-auto">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <SparkleStars />
          <h2 className="text-2xl font-bold text-purple-800 tracking-tight flex items-center gap-2">
            어린이날 선물을 사달라는 요청이 왔어요!
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <img
            src={iffy?.gift_image_url}
            alt="선물 이미지"
            className="w-full h-auto rounded-md max-w-[500px]"
          />
          {iffy?.is_person && (
            <p className="text-lg font-semibold text-blue-500 bg-white/50 w-full text-center rounded-md py-2">
              {iffy?.age}세로 추정돼요!
            </p>
          )}
          <div className="bg-white/50 w-full rounded-md p-5 px-4 space-y-3">
            <div className="text-xl md:text-2xl font-bold text-purple-800 tracking-tight w-full flex items-center">
              {iffy?.is_error ? (
                <div>{iffy?.gift_name}</div>
              ) : (
                <div>
                  <span>
                    {iffy?.brand} {iffy?.gift_name}
                  </span>
                  을 선물해 드릴게요.
                </div>
              )}
            </div>
            <p className="text-base font-semibold text-purple-950">
              {iffy?.commentary}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          {!iffy?.is_error && (
            <Button
              className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white h-12 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg  cursor-pointer w-full duration-1000"
              onClick={handleGoToLink}
            >
              사주러가기
            </Button>
          )}

          <div className="flex gap-2 w-full text-center">
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 gap-2 text-sm cursor-pointer flex-1"
              onClick={() => router.push("/")}
            >
              나도해보기
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

export default EachResultTemplate;
