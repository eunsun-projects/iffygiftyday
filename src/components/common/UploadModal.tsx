"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MAX_POLL_ATTEMPTS } from "@/constants/iffy.const";
import { useIffyMutation, usePollIffyStatusQuery } from "@/hooks/query.hooks";
import useIffyStore from "@/store/zustand";
import type { LoadingState } from "@/types/iffy.types";
import { Gift, Image, LoaderPinwheel, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UploadModalProps {
  loading: LoadingState;
  setLoading: React.Dispatch<React.SetStateAction<LoadingState>>;
}

export default function UploadModal({ loading, setLoading }: UploadModalProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<
    "idle" | "submitting" | "processing" | "completed" | "failed"
  >("idle");

  const { mutateAsync: startIffy } = useIffyMutation();
  const { refetchCount, setRefetchCount } = useIffyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: tempIffy, error: statusError } = usePollIffyStatusQuery(
    id,
    refetchCount
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (
      !selectedFile ||
      appStatus === "submitting" ||
      appStatus === "processing"
    ) {
      return;
    }
    setLoading({ ...loading, open: true });
    setAppStatus("submitting");
    setId(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const startResponse = await startIffy({ formData });
      console.log("Job submitted, Job ID:", startResponse.id);
      timerRef.current = setTimeout(() => {
        setId(startResponse.id);
        setAppStatus("processing");
        if (timerRef.current) clearTimeout(timerRef.current);
      }, 15000);
    } catch (error) {
      console.error("업로드 실패:", error);
      const exceeded = (error as Error).message.includes(
        "AI 최대 사용량을 초과했어요."
      );
      setAppStatus("failed");
      setLoading({ ...loading, open: false });
      toast.error(
        exceeded
          ? "AI 최대 사용량을 초과했어요."
          : "업로드 중 오류가 발생했습니다."
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setPreviewSrc(reader.result);
          } else {
            setPreviewSrc(null);
          }
        };
        reader.onerror = () => {
          console.error("파일 읽기 오류");
          setPreviewSrc(null);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewSrc(null);
        alert("이미지 파일만 미리보기할 수 있습니다.");
      }
    } else {
      setSelectedFile(null);
      setPreviewSrc(null);
    }

    if (event.target) {
      (event.target as HTMLInputElement).value = "";
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewSrc(null);

      if (appStatus === "processing" || appStatus === "submitting") {
        console.log("Modal closed during processing, resetting state.");
        if (timerRef.current) clearTimeout(timerRef.current);
        setId(null);
        setAppStatus("idle");
        setLoading({ open: false, isError: false });
      }
      if (appStatus === "completed" || appStatus === "failed") {
        setRefetchCount(0);
        setAppStatus("idle");
      }
    }
  }, [isOpen, appStatus, setLoading, setRefetchCount]);

  useEffect(() => {
    if (!id) return;

    let shouldStopPolling = false;
    let errorOccurred = false;
    let errorMessage = "";
    let nextAppStatus = appStatus;

    if (tempIffy?.status === "completed") {
      console.log("Polling complete, result:", tempIffy);
      nextAppStatus = "completed";
      shouldStopPolling = true;
      router.push(`/result?id=${id}`);
    } else if (tempIffy?.status === "failed") {
      console.error("Processing failed:", tempIffy.commentary);
      nextAppStatus = "failed";
      shouldStopPolling = true;
      errorOccurred = true;
      errorMessage = "서버 처리 중 오류가 발생했습니다.";
    } else if (statusError) {
      console.error("Polling error:", statusError);
      nextAppStatus = "failed";
      shouldStopPolling = true;
      errorOccurred = true;
      errorMessage = "결과 확인 중 오류가 발생했습니다.";
    } else if (refetchCount >= MAX_POLL_ATTEMPTS) {
      console.warn(`Polling timed out after ${MAX_POLL_ATTEMPTS} attempts.`);
      nextAppStatus = "failed";
      shouldStopPolling = true;
      errorOccurred = true;
      errorMessage =
        "결과 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
    }

    if (shouldStopPolling) {
      setAppStatus(nextAppStatus);
      setRefetchCount(0);
      setId(null);
      setSelectedFile(null);
      setPreviewSrc(null);
      setLoading({ open: false, isError: errorOccurred });
      setIsOpen(false);
      if (errorOccurred) {
        toast.error(errorMessage);
      }
    }
  }, [
    tempIffy,
    statusError,
    router,
    id,
    setLoading,
    refetchCount,
    setRefetchCount,
    appStatus,
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="box-content bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white py-2 !px-7 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-lg cursor-pointer">
          <Gift className="h-5 w-5" />
          <span>참여하기</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        onInteractOutside={(e) => {
          if (loading.open) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (loading.open) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-black">이미지 업로드</DialogTitle>
          <DialogDescription>
            업로드한 이미지는 캐릭터 생성을 위해 잠깐 사용되며, 저장되지 않아요.
          </DialogDescription>
          {loading.open && (
            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-white font-black z-50 animate-pulse">
              1분 정도 기다려주세요...
            </p>
          )}
        </DialogHeader>

        <div className="h-80 border border-dashed rounded-md relative">
          {loading.open && (
            <div
              style={{
                animation: "scan 3s linear infinite alternate",
              }}
              className="w-full h-1 bg-[#78EFAD] shadow-[0_0_20px_6px_#78EFAD] absolute top-full"
            />
          )}

          {previewSrc ? (
            <>
              {!loading.open && (
                <Button
                  className="absolute top-2 right-2 p-0.5 cursor-pointer"
                  variant="secondary"
                  onClick={() => {
                    setPreviewSrc(null);
                    setSelectedFile(null);
                  }}
                >
                  <Trash2 color="red" size={16} />
                </Button>
              )}
              <img
                src={previewSrc}
                alt="선택된 이미지 미리보기"
                className="h-full w-full object-contain"
              />
            </>
          ) : (
            <button
              type="button"
              className="p-4 cursor-pointer h-full w-full flex flex-col justify-center items-center text-center text-gray-400 gap-1 text-xs bg-transparent border-none"
              onClick={handleUploadClick}
            >
              <Image /> 이미지 업로드 <br /> (PNG, JPG, JPEG)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleUploadClick}
            className="cursor-pointer text-neutral-600"
            variant={"outline"}
          >
            업로드
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <Button
            className="cursor-pointer"
            disabled={!selectedFile || loading.open}
            onClick={handleSubmit}
          >
            {loading.open ? (
              <LoaderPinwheel className="animate-spin" />
            ) : (
              "제출하기"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
