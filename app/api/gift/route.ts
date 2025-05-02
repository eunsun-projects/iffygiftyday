import { getIffy, saveIffy } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { generateUUID } from "@/lib/utils";
import type { Iffy } from "@/types/iffy.types";
import { openai as aiSdkOpenai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { type NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import sharp from "sharp";
import { z } from "zod";

// --- 환경 변수 확인 ---
// OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error("Missing environment variable OPENAI_API_KEY");
}
const openai = new OpenAI({ apiKey: openaiApiKey });

// Google Sheets
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const giftSheetId = process.env.GIFT_SHEET_ID;

if (!serviceAccountEmail || !privateKey || !giftSheetId) {
  console.error("Missing Google Sheets environment variables");
  // Consider how to handle this error in production. Maybe return a specific error response.
}

// --- 타입 정의 ---
interface GiftData {
  브랜드: string;
  "제품 명": string;
  "제품 설명": string;
  나이대: string; // Assuming the column name is '나이대'
  "제품 링크": string;
  [key: string]: unknown; // Use unknown instead of any for better type safety
}

interface GiftResponse {
  age: number;
  is_person: boolean;
  desc: string;
  is_error: boolean;
  gift_name: string;
  brand: string;
  gift_image_url: string;
  commentary: string;
  link: string;
  humor: string;
}

// --- Zod 스키마 정의 ---
const ImageAnalysisSchema = z.object({
  is_person: z.boolean(),
  desc: z.string(),
  age: z.number().int().nonnegative(),
});

const GiftRecommendationSchema = z.object({
  제품명: z.string(),
  추천이유: z.string(),
  유머: z.string(),
});

// --- Google Sheets 설정 ---
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
    await doc.loadInfo(); // loads document properties and worksheets
    return doc;
  } catch (error) {
    console.error("Error loading Google Sheet:", error);
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
    "https://ageijospngqmyzptvsoo.supabase.co/storage/v1/object/public/imageFile/iffy/fallback_image.webp"; // Fallback image
  let reason = "문제가 발생했어요. 다시 시도해볼까요?";
  let humor = "사진이 너무 귀여워서 AI가 심쿵했어요… 추천은 잠시 쉬어갈게요!";

  try {
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
    const mimeType = imageFile.type || "image/png";

    // 2. 이미지 분석 (AI SDK 사용)
    console.log("이미지 분석 시작...");
    const analysisResult = await generateObject({
      model: aiSdkOpenai("gpt-4o"), // Using standard GPT-4o which includes vision
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
    console.log("이미지 분석 결과:", analysisResult.object);

    isPerson = analysisResult.object.is_person;
    desc = analysisResult.object.desc;
    age = analysisResult.object.age;

    // 3. Google Sheets에서 선물 목록 로드
    console.log("Google Sheet 로드 시작...");
    const doc = await setupGoogleSheet();
    if (!doc) {
      throw new Error("Failed to load Google Sheet");
    }
    const sheet = doc.sheetsByIndex[0]; // 첫 번째 시트 사용
    const rows = await sheet.getRows<GiftData>();
    const giftData: GiftData[] = rows.map((row) => row.toObject() as GiftData);
    console.log(
      `Google Sheet에서 ${giftData.length}개의 선물 데이터 로드 완료`
    );

    // 사람이 아닌 경우, 바로 'CJ나눔재단 기부' 추천
    if (!isPerson) {
      console.log("사람이 아닌 대상으로 판단되어 기부 옵션을 찾습니다.");
      const donationGift = giftData.find(
        (g) => g["제품 명"] === "CJ나눔재단 기부"
      );
      if (donationGift) {
        giftName = donationGift["제품 명"];
        brand = donationGift.브랜드 || "CJ나눔재단";
        giftLink = donationGift["제품 링크"] || ""; // 기부 링크가 시트에 있는지 확인 필요
        reason =
          "특별한 날, 나눔의 기쁨을 선물하는 건 어떨까요? 따뜻한 마음을 전해보세요.";
        humor = "이프지만... 세상 모든 존재에게 따뜻함을 전해요!";
        console.log("기부 옵션으로 설정:", {
          giftName,
          brand,
          giftLink,
          reason,
          humor,
        });
        // 선물 추천 로직 건너뛰고 이미지 스타일화로 바로 이동
      } else {
        console.error(
          "'CJ나눔재단 기부' 항목을 Google Sheet에서 찾을 수 없습니다."
        );
        throw new Error("기부 옵션 설정을 위한 데이터를 찾지 못했습니다.");
      }
    } else {
      // 사람인 경우, 기존 선물 추천 로직 진행
      // 4. 나이대 결정
      let ageGroup: string;
      if (age <= 5) ageGroup = "0-5";
      else if (age <= 10) ageGroup = "6-10";
      else if (age <= 20) ageGroup = "11-20";
      else if (age <= 30) ageGroup = "21-30";
      else if (age <= 40) ageGroup = "31-40";
      else if (age <= 50) ageGroup = "41-50";
      else if (age <= 60) ageGroup = "51-60";
      else if (age <= 70) ageGroup = "61-70";
      else ageGroup = "71-";
      console.log("결정된 나이대:", ageGroup);

      // 5. 후보 선물 필터링
      const candidates = giftData.filter((g) => g.나이대 === ageGroup);
      console.log(`필터링된 후보 선물 개수: ${candidates.length}`);

      if (!candidates.length) {
        // 해당 나이대에 후보가 없으면 기부 옵션 제안
        console.warn(
          `해당 나이대(${ageGroup})에 맞는 선물이 없어 기부 옵션을 찾습니다.`
        );
        const donationGift = giftData.find(
          (g) => g["제품 명"] === "CJ나눔재단 기부"
        );
        if (donationGift) {
          giftName = donationGift["제품 명"];
          brand = donationGift.브랜드 || "CJ나눔재단";
          giftLink = donationGift["제품 링크"] || "";
          reason = `AI도 ${ageGroup} 나이대 선물을 고르기 어려웠나봐요! 대신 따뜻한 마음을 나누는 기부를 추천해요.`;
          humor = "선물 고민될 땐 나눔이 최고!";
          console.log("나이대 부재로 기부 옵션 설정:", {
            giftName,
            brand,
            giftLink,
            reason,
            humor,
          });
          // 선물 추천 로직(GPT 호출) 건너뛰고 이미지 스타일화로 바로 이동
        } else {
          console.error(
            "'CJ나눔재단 기부' 항목을 Google Sheet에서 찾을 수 없습니다."
          );
          throw new Error("기부 옵션 설정을 위한 데이터를 찾지 못했습니다.");
        }
      } else {
        // 후보가 있으면 GPT에게 추천 요청
        const giftOptions = candidates
          .map(
            (g, idx) =>
              `${idx + 1}. 브랜드: ${g.브랜드}, 제품 명: ${
                g["제품 명"]
              }, 설명: ${g["제품 설명"]}`
          )
          .join("\n");

        const unifiedPrompt = `다음은 어린이날 선물 후보 목록입니다:\n${giftOptions}\n\n이미지 분석 결과 대상은 '${desc}'(으)로 묘사됩니다.\n${
          isPerson ? `나이는 약 ${age}세입니다.` : "사람은 아니에요."
        }\n\n가장 잘 어울리는 선물을 하나를 골라주세요. 특히, 이미지 분석 결과인 '${desc}'(으)로 묘사되고 ${
          isPerson ? `약 ${age}세로 추정되는` : "사람이 아닌"
        } 대상에게 가장 적합하다고 생각되는 선물을, 선물 후보의 설명을 바탕으로 신중하게 골라주세요.\n고른 선물과 관련해서 어린이날 선물을 받아도 되는지 판독하는 듯한 유머러스한 메시지를 유머 필드에 한 문장으로 짧고 재치있게 만들어주세요. (ex. 이제는 선물을 줄 나이랍니다! / 마음은 아직도 초등학생인데요? )\n그리고 추천 이유도 어린이날 선물이라는 것을 연관지어 추천이유 필드에 작성해주세요.\n❗ 반드시 '제품 명'은 후보 목록에 있는 이름을 정확하게 복사해서 써야 해요.\n\n응답은 반드시 아래 JSON 형식으로 해주세요:\n{\n  "제품명": "후보 목록에 있는 제품 명 중 하나",\n  "추천이유": "...",\n  "유머": "..."\n}`;

        console.log("선물 추천 프롬프트 생성 완료, GPT 호출 시작...");
        const recommendationResult = await generateObject({
          model: aiSdkOpenai("gpt-4o-mini"),
          schema: GiftRecommendationSchema,
          system: "너는 센스 있는 선물 추천 AI야. 형식에 꼭 맞게 대답해야 해.",
          prompt: unifiedPrompt,
        });
        console.log("선물 추천 결과:", recommendationResult.object);

        giftName = recommendationResult.object.제품명;
        reason = recommendationResult.object.추천이유;
        humor = recommendationResult.object.유머;

        const bestMatch = candidates.find((g) => g["제품 명"] === giftName);

        if (!bestMatch) {
          console.error(
            `GPT가 선택한 '${giftName}'이(가) 후보 목록(${ageGroup})에 없습니다. 기부 옵션을 찾습니다. 후보:`,
            candidates.map((c) => c["제품 명"])
          );
          // Fallback: GPT가 이상한 추천을 하면 기부 옵션 제안
          const donationGift = giftData.find(
            (g) => g["제품 명"] === "CJ나눔재단 기부"
          );
          if (donationGift) {
            console.warn(`대체 선물로 'CJ나눔재단 기부' 선택`);
            giftName = donationGift["제품 명"];
            brand = donationGift.브랜드 || "CJ나눔재단";
            giftLink = donationGift["제품 링크"] || "";
            reason =
              "AI가 길을 잃었나봐요! 추천 대신 마음을 나누는 기부는 어떨까요?";
            humor = "선물보다 값진 나눔의 기쁨!";
          } else {
            console.error(
              "'CJ나눔재단 기부' 항목을 Google Sheet에서 찾을 수 없습니다."
            );
            // 기부 옵션도 없다면, 기존처럼 첫번째 후보라도 제안하거나 혹은 에러 처리
            const fallbackGift = candidates[0];
            if (fallbackGift) {
              console.warn(
                `기부 옵션도 없어 첫 번째 후보(${fallbackGift["제품 명"]})로 대체합니다.`
              );
              giftName = fallbackGift["제품 명"];
              brand = fallbackGift.브랜드 || "";
              giftLink = fallbackGift["제품 링크"] || "";
              reason =
                "AI 추천을 찾지 못해 다른 선물을 골랐어요. 이것도 좋아할 거예요!";
              humor = "가끔은 예상치 못한 선물이 더 좋을 때도 있죠!";
            } else {
              throw new Error(
                `GPT 선택(${giftName})도 없고, 기부 옵션도 없고, 대체할 후보 선물도 없습니다.`
              );
            }
          }
        } else {
          brand = bestMatch.브랜드 || "";
          giftLink = bestMatch["제품 링크"] || "";
        }
      }
    }

    // 6. 이미지 캐릭터 스타일화 (OpenAI SDK 직접 사용)
    console.log("이미지 스타일화 시작...");
    let stylePrompt: string;
    if (isPerson) {
      stylePrompt = `make this person look like a cute cartoon character who is ${age} years old, with a soft and playful illustration style`;
    } else {
      stylePrompt =
        "make this object look like a cute cartoon character, with a soft and playful illustration style";
    }

    // Convert Buffer to a File-like object for OpenAI API
    const imageBlob = new Blob([imageBuffer], { type: mimeType });
    const imageFileForApi = new File(
      [imageBlob],
      imageFile.name || "input.png",
      { type: mimeType }
    );

    const stylizedResult = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFileForApi,
      prompt: stylePrompt,
      size: "1024x1024", // Or other supported size
      quality: "auto",
    });

    const imageBase64 = stylizedResult.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("이미지 스타일화 실패: Base64 데이터가 없습니다.");
    }

    // 1. Base64 문자열을 Buffer로 디코딩
    const pngBuffer = Buffer.from(imageBase64, "base64");

    // 2. Sharp를 사용하여 WebP로 변환
    console.log("Sharp로 이미지 변환 시작 (PNG -> WebP)...");
    const webpBuffer = await sharp(pngBuffer)
      .webp({ quality: 80 }) // Adjust quality as needed (0-100)
      .toBuffer();
    console.log("WebP 변환 완료.");

    // 3. 고유 파일 경로 생성 (확장자 변경)
    const filePath = `iffy/${Date.now()}-${generateUUID()}.webp`; // Changed extension to .webp

    // 4. WebP Buffer를 사용하여 업로드
    console.log("Supabase에 WebP 이미지 업로드 시작...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("imageFile")
      .upload(filePath, webpBuffer, {
        // Use webpBuffer
        contentType: "image/webp", // Changed contentType to image/webp
        upsert: true,
      });

    if (uploadError) {
      console.error("[private-scenery] Supabase upload error:", uploadError);
      throw new Error("Failed to upload generated image to storage.");
    }

    // 4. 공개 URL 가져오기
    const { data: publicUrlData } = supabase.storage
      .from("imageFile")
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Failed to get public URL for the uploaded image.");
    }

    imageUrl = publicUrlData.publicUrl;

    console.log("이미지 스타일화 완료, URL:", imageUrl);
  } catch (error) {
    console.error("Error in gift recommendation:", error);
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    if ((error as any).code === "moderation_blocked") {
      isError = true;
      reason = "문제의 소지가 있는 이미지에요! 다시 시도해주세요";
    } else {
      isError = true;
    }
    // 오류 발생 시 기본값 사용 (이미 위에서 설정됨)
  }

  // 최종 응답 구성
  // Get current user ID for RLS
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const iffyToSupabase: Iffy = {
    id: generateUUID(),
    age,
    is_person: isPerson,
    desc,
    is_error: isError,
    gift_name: giftName,
    brand,
    gift_image_url: imageUrl,
    commentary: reason,
    link: giftLink,
    humor,
    user_id: user?.id ?? null,
    created_at: new Date().toISOString(),
  };

  const { data: iffyData, error: iffyError } = await saveIffy({
    iffy: iffyToSupabase,
  });

  if (iffyError) {
    console.error("Failed to save iffy to supabase:", iffyError);
    return NextResponse.json(
      { error: "Failed to save iffy to supabase" },
      { status: 500 }
    );
  }

  return NextResponse.json(iffyData);
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
