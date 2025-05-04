"use client";

import useIffyStore from "@/store/zustand";
import type { Iffy } from "@/types/iffy.types";
import { useEffect } from "react";

function useKakao() {
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const { Kakao, setKakao } = useIffyStore();

  const handleShareToKakao = ({ iffyData }: { iffyData: Iffy }) => {
    if (!window.Kakao || !window.Kakao.Share) {
      alert("카카오톡 공유 기능이 로드되지 않았습니다.");
      return;
    }

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "선물을 사달라는 요청이 왔어요!",
        imageUrl: iffyData.gift_image_url,
        link: {
          webUrl: `${process.env.NEXT_PUBLIC_URL}}`,
          mobileWebUrl: `${process.env.NEXT_PUBLIC_URL}`,
        },
      },
      buttons: [
        {
          title: "보러가기",
          link: {
            webUrl: `${process.env.NEXT_PUBLIC_URL}/result/${iffyData.id}`,
            mobileWebUrl: `${process.env.NEXT_PUBLIC_URL}/result/${iffyData.id}`,
          },
        },
      ],
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const { Kakao } = window;
      if (Kakao) {
        Kakao.cleanup();
        Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);
        setKakao(Kakao);
      }
    }
  }, [setKakao]);

  return { handleShareToKakao };
}

export default useKakao;
