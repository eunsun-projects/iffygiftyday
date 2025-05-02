"use client";

import useKakao from "@/hooks/useKakao";
import useIffyStore from "@/store/zustand";
import type { Iffy } from "@/types/iffy.types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RiKakaoTalkFill } from "react-icons/ri";
import SparkleStars from "../common/SparkleStars";
import { Button } from "../ui/button";

// const iffyData: Iffy = {
// 	age: 3,
// 	is_person: true,
// 	is_error: false,
// 	desc: `추천할 선물은 바로 종근당건강의 프로메가 뉴티지 오메가3입니다! 왜냐고요? 면접 준비로 머리를 굴리다 보면 "아, 내 머릿속 오메가-3가 부족해!"라고 소리칠 순간이 올 거예요. 중간고사 때도 깜찍한 문제들이 날아오니, 이 오메가3가 나의 뇌를 보호해줄 수 있겠죠? 혼줄 안 맞고 성적 잘 나오게 도와주는 스텔스 버프 같은 거라니까요! 😄`,
// 	gift_name: "프로메가 뉴티지 오메가3",
// 	brand: "종근당건강",
// 	gift_image_url: "https://placehold.co/500x500",
// 	commentary: "코멘터리",
// 	link: "https://brand.naver.com/ckdhc/products/11324974098",
// 	humor: "선물 받기에 충분한 당신",
// 	user_id: null,
// };

function Result() {
  const router = useRouter();
  const { handleShareToKakao } = useKakao();

  const { iffy } = useIffyStore();

  if (!iffy?.gift_image_url) router.push("/");

  useEffect(() => {
    console.log(iffy);
  }, [iffy]);

  return (
    <div className="h-auto">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <SparkleStars />
          <h2 className="text-2xl font-bold text-purple-800 tracking-tight flex items-center gap-2">
            {iffy?.humor}
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
              onClick={() => handleShareToKakao({ iffyData: iffy as Iffy })}
            >
              사달라고 조르기
              <RiKakaoTalkFill height={24} width={24} className="size-6" />
            </Button>
          )}

          <div className="flex gap-2 w-full text-center">
            {iffy?.link && (
              <Link
                target="_blank"
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center justify-center flex-1"
                href={iffy.link}
              >
                직접 사러가기
              </Link>
            )}
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 gap-2 text-sm cursor-pointer flex-1"
              onClick={() => router.push("/")}
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

export default Result;
