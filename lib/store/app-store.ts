import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage/zustand-storage';

interface AppState {
  /** Demo persisted flag proving MMKV + Zustand (issue DEV-380). */
  bootstrapDemoSeen: boolean;
  setBootstrapDemoSeen: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      bootstrapDemoSeen: false,
      setBootstrapDemoSeen: (bootstrapDemoSeen) => set({ bootstrapDemoSeen }),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
