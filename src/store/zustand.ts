import type { Iffy } from "@/types/iffy.types";
import { create } from "zustand";

interface IffyStore {
  iffy: Iffy | null;
  setIffy: (iffy: Iffy) => void;
  refetchCount: number;
  setRefetchCount: (refetchCount: number) => void;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  Kakao: any | null;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  setKakao: (kakao: any) => void;
}

const useIffyStore = create<IffyStore>((set) => ({
  iffy: null,
  setIffy: (iffy) => set({ iffy }),
  Kakao: null,
  setKakao: (kakao) => set({ Kakao: kakao }),
  refetchCount: 0,
  setRefetchCount: (refetchCount) => set({ refetchCount }),
}));

export default useIffyStore;
