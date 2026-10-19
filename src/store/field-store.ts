import { create } from "zustand";

import { persist } from "zustand/middleware";

type Field = {
  id: string;
  name: string | null;
  fk_FarmingUnit: string | null;
};
  
type FieldStore = {
  fields: Field[];
  selectedField: Field | null;
  activeFarmId: string | null;
  ownerId: string | null;
  setField: (field: Field | null) => void;
  setFields: (fields: Field[]) => void;
  setActiveFarmId: (farmId: string | null) => void;
  setOwner: (ownerId: string | null) => void;
  reset: () => void;
};

export const useFieldStore = create<FieldStore>()(
  persist(
    (set) => ({
      fields: [], // ← empty — filled from DB, scoped to the active farm
      selectedField: null, // ← null — set after fetch
      activeFarmId: null, // ← the farm whose parcelles fill the selector
      ownerId: null, // ← the user this selection belongs to
      setField: (field) => set({ selectedField: field }),
      setFields: (fields) => set({ fields }),
      setActiveFarmId: (farmId) => set({ activeFarmId: farmId }),
      setOwner: (ownerId) => set({ ownerId }),
      reset: () => set({ fields: [], selectedField: null, activeFarmId: null, ownerId: null }),
    }),
    {
      name: "ioseeds-field-store",
      partialize: (state) => ({
        selectedField: state.selectedField,
        activeFarmId: state.activeFarmId,
        ownerId: state.ownerId,
      }),
      // ↑ only persist the selection + farm context — fields re-fetched from DB
    }
  )
);
