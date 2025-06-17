import { getGenerateIffy } from "@/apis/iffy.apis";
import { getIffy, saveIffy } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { generateUUID } from "@/lib/utils";
import type { Iffy } from "@/types/iffy.types";
import { createOpenAI } from "@ai-sdk/openai";
import { type GenerateObjectResult, type RetryError, generateObject } from "ai";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";

export const dynamic = "force-dynamic";

// --- 환경 변수 확인 ---
// OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("Missing environment variable OPENAI_API_KEY");
}
const aiSdkOpenai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Google Sheets
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const giftSheetId = process.env.GIFT_SHEET_ID;

if (!serviceAccountEmail || !privateKey || !giftSheetId) {
  console.error("Missing Google Sheets environment variables");
}

// --- 타입 정의 ---
interface GiftData {
  brand: string;
  name: string;
  description: string;
  age_group: string;
  product_link: string;
  product_img: string;
  [key: string]: unknown; // Use unknown instead of any for better type safety
}

// --- Zod 스키마 정의 ---
const ImageAnalysisSchema = z.object({
  is_person: z.boolean(),
  desc: z.string(),
  age: z.number().int().nonnegative(),
});

const GiftRecommendationSchema = z.object({
  product_name: z.string(),
  reason: z.string(),
  humor: z.string(),
});

// --- Google Sheets 설정 (캐싱 로직 제거) ---
const setupGoogleSheet = async (): Promise<GoogleSpreadsheet | null> => {
  if (!serviceAccountEmail || !privateKey || !giftSheetId) {
    console.error("Google Sheets credentials not configured properly.");
    return null;
  }
  try {
    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const doc = new GoogleSpreadsheet(giftSheetId, jwt);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error("Error loading Google Sheet info:", error);
    return null;
  }
};

// --- API 라우트 핸들러 ---
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let age = 0;
  let isPerson = false;
  let desc = "분석 실패";
  let isError = false;
  let giftName = "🤖";
  let brand = "";
  let giftLink = "";
  let imageUrl =
    "https://ageijospngqmyzptvsoo.supabase.co/storage/v1/object/public/imageFile/iffy/fallback_image.webp";
  let reason = "문제가 발생했어요. 다시 시도해볼까요?";
  let humor = "사진이 너무 귀여워서 AI가 심쿵했어요… 추천은 잠시 쉬어갈게요!";
  let stylePrompt = "";
  let product_img_url = "";

  try {
    // --- Google Sheets 데이터 로드 (캐싱 제거) ---
    console.time("Google Sheet 로드 시간");
    console.log("Loading gift data from Google Sheet...");
    const doc = await setupGoogleSheet();
    if (!doc) {
      throw new Error("Failed to load Google Sheet document.");
    }
    const sheet = doc.sheetsByIndex[1]; // lg 선물 시트
    const rows = await sheet.getRows<GiftData>();
    const giftData: GiftData[] = rows.map((row) => row.toObject() as GiftData);
    if (!giftData || giftData.length === 0) {
      throw new Error("선물 데이터를 Google Sheet에서 가져올 수 없습니다.");
    }
    console.log(
      `Successfully loaded ${giftData.length} gift items from Google Sheet.`
    );
    console.timeEnd("Google Sheet 로드 시간");

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 1. 이미지 읽기 및 인코딩
    const imageBytes = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(imageBytes);

    // 2. 이미지 분석 (AI SDK 사용)
    console.log("이미지 분석 시작...");
    let analysisResult: GenerateObjectResult<{
      is_person: boolean;
      desc: string;
      age: number;
    }>;
    try {
      analysisResult = await generateObject({
        model: aiSdkOpenai("gpt-4o-mini"), // Using standard GPT-4o which includes vision
        schema: ImageAnalysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `이 사진을 보고 다음 정보를 JSON 형식으로 알려줘: is_person (true/false), desc (대상의 묘사), age (예상 나이 숫자). 예시: {"is_person": true, "desc": "귀여운 아이", "age": 6}`,
              },
              { type: "image", image: imageBuffer }, // Pass buffer directly
            ],
          },
        ],
      });
      console.log("1차 vision token 사용량:", analysisResult.usage);
    } catch (error) {
      console.error("이미지 분석 오류:", error);
      if ((error as RetryError).reason === "maxRetriesExceeded") {
        throw new Error(
          "AI 최대 사용량을 초과했어요. 나중에 다시 시도해주세요."
        );
      }
      return NextResponse.json(
        { error: "이미지 분석 오류가 발생했어요. 다시 시도해볼까요?" },
        { status: 500 }
      );
    }
    console.log("이미지 분석 결과:", analysisResult.object);

    isPerson = analysisResult.object.is_person;
    desc = analysisResult.object.desc;
    age = analysisResult.object.age;

    // 사람이 아닌 경우, 바로 'CJ나눔재단 기부' 추천
    if (!isPerson) {
      console.log(
        "사람이 아닌 대상으로 판단되어 기본 LG제품(QNED TV)을 추천합니다."
      );
      const fallbackGift = giftData.find((g) => g.name === "LG QNED TV");
      if (fallbackGift) {
        giftName = fallbackGift.name;
        brand = fallbackGift.brand || "LG";
        giftLink = fallbackGift.product_link || "";
        reason =
          "도대체 무슨 사진을 올린거에요? 그냥 기본 LG제품(QNED TV)을 추천해드릴게요.";
        humor = "잘 모르겠을때는 TV가 최고!";
        product_img_url = fallbackGift.product_img || "";
        console.log("기부 옵션으로 설정:", {
          giftName,
          brand,
          giftLink,
          reason,
          humor,
        });
        // 선물 추천 로직 건너뛰고 이미지 스타일화로 바로 이동
      } else {
        console.error("'LG QNED TV' 항목을 Google Sheet에서 찾을 수 없습니다.");
        throw new Error(
          "기본 LG제품(QNED TV) 설정을 위한 데이터를 찾지 못했습니다."
        );
      }
    } else {
      // 사람인 경우, 기존 선물 추천 로직 진행
      // 4. 나이대 결정
      let ageGroup: string;
      if (age <= 20) ageGroup = "0-20";
      else if (age <= 40) ageGroup = "21-40";
      else if (age <= 60) ageGroup = "41-60";
      else if (age <= 80) ageGroup = "61-";
      else ageGroup = "기타";
      console.log("결정된 나이대:", ageGroup);

      // 5. 후보 선물 필터링
      const candidates = giftData.filter((g) => g.age_group === ageGroup);
      console.log(`필터링된 후보 선물 개수: ${candidates.length}`);

      if (!candidates.length) {
        // 해당 나이대에 후보가 없으면 기부 옵션 제안
        console.warn(
          `해당 나이대(${ageGroup})에 맞는 선물이 없어 기본 LG제품(QNED TV)을 추천합니다.`
        );
        const fallbackGift = giftData.find((g) => g.name === "LG QNED TV");
        if (fallbackGift) {
          giftName = fallbackGift.name;
          brand = fallbackGift.brand || "LG";
          giftLink = fallbackGift.product_link || "";
          reason = `AI도 ${ageGroup} 나이대 선물을 고르기 어려웠나봐요! 대신 기본 LG제품(QNED TV)을 추천해요.`;
          humor = "잘 모르겠을때는 TV가 최고!";
          product_img_url = fallbackGift.product_img || "";
          console.log("나이대 부재로 기본 LG제품(QNED TV) 설정:", {
            giftName,
            brand,
            giftLink,
            reason,
            humor,
          });
          // 선물 추천 로직(GPT 호출) 건너뛰고 이미지 스타일화로 바로 이동
        } else {
          console.error(
            "'LG QNED TV' 항목을 Google Sheet에서 찾을 수 없습니다."
          );
          throw new Error(
            "기본 LG제품(QNED TV) 설정을 위한 데이터를 찾지 못했습니다."
          );
        }
      } else {
        // 후보가 있으면 GPT에게 추천 요청
        const giftOptions = candidates
          .map(
            (g, idx) =>
              `${idx + 1}. 브랜드: ${g.brand}, 제품 명: ${
                g.name
              }, 설명: ${g.description}`
          )
          .join("\n");

        const unifiedPrompt = `애매한이날은 어린이날 맞춤 이벤트로 어린이인지를 판단하여 재치있는 답변을 해주는 프로젝트입니다. 어린이의 기준은 20세까지입니다. 어린이가 아니라도 선물은 추천해야 합니다. 다음은 애매한이날 선물 후보 목록입니다:\n\n${giftOptions}\n\n이미지 분석 결과 대상은 '${desc}'(으)로 묘사됩니다.\n나이는 약 ${age}세입니다.\n가장 잘 어울리는 LG전자 제품 선물을 하나 골라주세요. 특히, 이미지 분석 결과인 '${desc}'(으)로 묘사되고 약 ${age}세로 추정되는 대상에게 가장 적합하다고 생각되는 선물을, 선물 후보의 설명을 바탕으로 신중하게 골라주세요.\n고른 선물과 관련해서 어린이날 선물을 받아도 되는지 판독하는 듯한 유머러스한 메시지를 유머 필드에 한 문장으로 짧고 재치있게 만들어주세요. 꼭 다음의 예제가 아니어도 됩니다.(ex. 무럭무럭 자랄 나이예요. 아직 말도 다 못하지만, 공기는 맑아야죠? LG 퓨리케어, 첫 선물로 딱이에요 / 초딩이지만 눈은 4K만 찾는 당신! LG 스탠바이미 Go로 동화도 보고 유튜브도 보고, 다 되네? / 감정 기복은 심하지만, 영상은 부드러워야죠. LG QNED TV, 중2병도 감동할 화질! / 수능도 시험도 중요한데, 속도가 느리면 열받잖아요? LG 그램, 가볍고 빠르게 미래로 가자 / 출근은 지옥인데, 스타일은 포기 못 해. 오늘도 깔끔한 옷엔 LG 스타일러 한 방이면 끝! / 이젠 내가 선물을 받기보단 챙겨주는 나이… 하지만 LG 트롬 건조기는 나를 위한 최소한의 효도지 / 나이 들수록 건강이 중요해요. 힐링미 안마의자로 피로를 풀어보세요 / 그간의 노고 수고하셨습니다! 오늘의 피로를 오브제 안마의자로 풀어보세요)\n그리고 추천 이유도 어린이날 선물이라는 것을 연관지어 추천이유 필드에 작성해주세요.\n❗ 반드시 'product_name'은 후보 목록에 있는 이름을 정확하게 복사해서 써야 해요.\n\n응답은 반드시 아래 JSON 형식으로 해주세요:\n{\n  "product_name": "후보 목록에 있는 제품 명 중 하나",\n  "reason": "...",\n  "humor": "..."\n}`;

        console.log("선물 추천 프롬프트 생성 완료, GPT 호출 시작...");
        const recommendationResult = await generateObject({
          model: aiSdkOpenai("gpt-4o-mini"),
          schema: GiftRecommendationSchema,
          system: "너는 센스 있는 선물 추천 AI야. 형식에 꼭 맞게 대답해야 해.",
          prompt: unifiedPrompt,
        });
        console.log("선물 추천 결과:", recommendationResult.object);
        console.log("2차 선물추천 token 사용량:", recommendationResult.usage);

        giftName = recommendationResult.object.product_name;
        reason = recommendationResult.object.reason;
        humor = recommendationResult.object.humor;

        // 선물 목록(candidates)에서 GPT 응답(giftName)과 가장 일치하는 것을 찾습니다.
        // 이때, 양쪽 문자열의 앞뒤 공백을 제거하고 비교합니다.
        const trimmedGiftName = giftName.trim(); // GPT 응답 공백 제거
        const bestMatch = candidates.find(
          (g) => g.name && g.name.trim() === trimmedGiftName // 후보 제품명 공백 제거 후 비교
        );

        if (!bestMatch) {
          console.error(
            `정리된 GPT 이름 '${trimmedGiftName}'이(가) 후보 목록(${ageGroup})에 없습니다. 기본 LG제품(QNED TV)을 찾습니다. 후보:`,
            candidates.map((candidate) => candidate.name) // 로그에는 원본 후보 목록 표시
          );
          // Fallback: GPT가 이상한 추천을 하면 fallback 옵션 제안
          const donationGift = giftData.find((g) => g.name === "LG QNED TV");
          if (donationGift) {
            console.warn(`대체 선물로 'LG QNED TV' 선택`);
            giftName = donationGift.name;
            brand = donationGift.brand || "LG";
            giftLink = donationGift.product_link || "";
            product_img_url = donationGift.product_img || "";
            reason =
              "AI가 길을 잃었나봐요! 그래도 선물은 있죠! LG QNED TV를 추천해드릴게요.";
            humor = "잘 모르겠을때는 TV가 최고!";
          } else {
            console.error(
              "'LG QNED TV' 항목을 Google Sheet에서 찾을 수 없습니다."
            );
            // 기부 옵션도 없다면, 기존처럼 첫번째 후보라도 제안하거나 혹은 에러 처리
            const fallbackGift = candidates[0];
            if (fallbackGift) {
              console.warn(
                `기부 옵션도 없어 첫 번째 후보(${fallbackGift.name})로 대체합니다.`
              );
              giftName = fallbackGift.name;
              brand = fallbackGift.brand || "";
              giftLink = fallbackGift.product_link || "";
              product_img_url = fallbackGift.product_img || "";
              reason =
                "AI 추천을 찾지 못해 다른 선물을 골랐어요. 이것도 좋아할 거예요!";
              humor = "잘 모르겠을때는 TV가 최고!";
            } else {
              throw new Error(
                `GPT 선택(${giftName})도 없고, 기부 옵션도 없고, 대체할 후보 선물도 없습니다.`
              );
            }
          }
        } else {
          brand = bestMatch.brand || "";
          giftLink = bestMatch.product_link || "";
        }
      }
    }

    // 6. 이미지 캐릭터 스타일화 (OpenAI SDK 직접 사용)
    console.log("이미지 스타일화 시작...");
    if (isPerson) {
      stylePrompt = `make this person look like a cute cartoon character who is ${age} years old, with a soft and playful illustration style`;
    } else {
      // 사람이 아닌 경우 (기부 추천되었을 수 있음), 스타일 프롬프트는 대상 묘사 기반
      stylePrompt = `make the subject described as '${desc}' look like a cute cartoon character, with a soft and playful illustration style`;
    }

    // 2. Sharp를 사용하여 png로 변환
    // 이미 png 면 건너뜀
    let pngInputBuffer: Buffer | null = null;
    if (imageFile.type !== "image/png") {
      // --- PNG로 변환 시작 ---
      console.log("Sharp로 이미지 변환 시작 (WebP -> PNG)...");
      pngInputBuffer = await sharp(imageBuffer).png().toBuffer();
      console.log("PNG 변환 완료.");
      // --- PNG로 변환 끝 ---
    }

    // 3. 고유 파일 경로 생성 (확장자 변경)
    const originalFilePath = `iffy-original/${Date.now()}-${generateUUID()}.webp`; // Changed extension to .webp

    // 4. PNG Buffer를 사용하여 업로드
    console.log("Supabase에 PNG original 이미지 업로드 시작...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("imageFile")
      .upload(originalFilePath, pngInputBuffer ?? imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[iffy] Supabase upload error:", uploadError);
      throw new Error("Failed to upload generated image to storage.");
    }

    // 4. 공개 URL 가져오기
    const { data: orignPublicUrlData } = supabase.storage
      .from("imageFile")
      .getPublicUrl(originalFilePath);

    if (!orignPublicUrlData || !orignPublicUrlData.publicUrl) {
      throw new Error("Failed to get public URL for the uploaded image.");
    }

    imageUrl = orignPublicUrlData.publicUrl;

    console.log("1차 처리 완료..");
  } catch (error) {
    console.error(
      "Error during initial processing (analysis/recommendation/sheets):",
      error
    );

    // 에러 메시지를 확인하여 '최대 시도 횟수 초과'인지 판단
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";

    if (errorMessage.includes("AI 최대 사용량을 초과했어요")) {
      // 특정 에러 메시지인 경우, DB 저장 없이 바로 500 에러 응답 반환
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 } // 또는 429 Too Many Requests 상태 코드가 더 적절할 수 있습니다.
      );
    }

    // 그 외 다른 초기 처리 오류의 경우, 기존 로직대로 isError 플래그 설정 후 진행
    isError = true;
    reason = `초기 처리 중 오류: ${errorMessage}`;
    // (여기서 return 하지 않으면 아래 DB 저장 로직으로 진행됨)
  }

  const id = generateUUID();
  let finalIffyData: Iffy | null = null;
  let finalError: Error | null = null;

  try {
    // 최종 응답 구성 및 1차 저장
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const iffyToSupabase: Iffy = {
      id,
      age,
      is_person: isPerson,
      desc,
      style_prompt: stylePrompt,
      is_error: isError,
      gift_name: giftName,
      brand,
      gift_image_url: imageUrl, // 초기에는 원본 이미지 URL 또는 fallback
      commentary: reason,
      link: giftLink,
      humor,
      product_img_url,
      user_id: user?.id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: isError ? "failed" : "processing", // 에러 발생 시 바로 failed 상태
    };

    console.log(
      "Saving initial Iffy data to Supabase with status:",
      iffyToSupabase.status
    );
    const { data: savedIffy, error: iffyError } = await saveIffy({
      iffy: iffyToSupabase,
    });

    if (iffyError) {
      console.error("Failed to save initial iffy to supabase:", iffyError);
      throw new Error("데이터베이스 저장 중 오류가 발생했습니다."); // Catch 블록에서 처리
    }

    finalIffyData = savedIffy; // 성공 시 데이터 저장

    // 초기 처리에서 에러가 없었을 경우에만 이미지 생성 API 호출
    if (!isError) {
      console.log("Calling image generation API for id:", id);
      const postGenResponse = await getGenerateIffy({ id });
      console.log("Image generation API response:", postGenResponse);

      if (postGenResponse.status === "error") {
        // 이미지 생성 실패 시 에러 처리 (DB 업데이트는 생성 API 내부에서 할 것으로 예상)
        console.error("Image generation API returned an error.");
        // 필요하다면 여기서 DB 상태를 'failed'로 업데이트 할 수도 있음
        // 하지만 getGenerateIffy 가 fire-and-forget 이라면 클라이언트 응답에 영향 X
        throw new Error("이미지 생성 요청 중 오류가 발생했습니다."); // 일단 throw 하지 않음
      }
    }
  } catch (error) {
    console.error("Error during final save or generation call:", error);
    finalError = error as Error;
    // isError 플래그는 이미 설정되었을 수 있음
    isError = true;
    reason = `최종 처리 중 오류: ${
      (error as Error).message || "알 수 없는 오류"
    }`;
    // 이 단계에서 오류 발생 시, finalIffyData는 null일 수 있음
    // 클라이언트에게는 오류 상태를 포함한 초기 데이터를 반환하거나, 명시적 오류 응답 반환
  }

  // 최종적으로 클라이언트에게 반환할 데이터 결정
  if (finalIffyData && !finalError) {
    // 모든 과정이 성공적 (이미지 생성 API 호출 결과는 별개)
    console.log(
      "Returning successful initial save data to client:",
      finalIffyData
    );
    return NextResponse.json(finalIffyData);
  }

  // 최종 저장/호출 단계 또는 그 이전 단계에서 에러 발생
  console.error("An error occurred. Returning error response.", {
    isError,
    reason,
  });
  // 클라이언트 폴링을 위해 id라도 포함된 기본 응답 반환 시도
  const errorResponse: Partial<Iffy> = {
    id: finalIffyData?.id || id, // ID는 최대한 반환
    is_error: true,
    commentary: reason,
    status: "failed",
    updated_at: new Date().toISOString(),
  };
  // 500 에러와 함께 실패 정보 반환
  return NextResponse.json(errorResponse, { status: 500 });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("id");

  if (!query) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data: iffyData, error: iffyError } = await getIffy({ id: query });

  if (iffyError) {
    return NextResponse.json({ error: "Failed to get iffy" }, { status: 500 });
  }

  return NextResponse.json(iffyData);
}
