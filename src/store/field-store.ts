import { create } from "zustand";

import { persist } from "zustand/middleware";

type Field = {
  id: string;
  name: string | null;
};

type FieldStore = {
  fields: Field[];
  selectedField: Field | null;
  setField: (field: Field) => void;
  setFields: (fields: Field[]) => void;
  reset: () => void;
};

export const useFieldStore = create<FieldStore>()(
  persist(
    (set) => ({
      fields: [], // ← empty — filled from DB
      selectedField: null, // ← null — set after fetch
      setField: (field) => set({ selectedField: field }),
      setFields: (fields) => set({ fields }),
      reset: () => set({ fields: [], selectedField: null }),
    }),
    {
      name: "ioseeds-field-store",
      partialize: (state) => ({ selectedField: state.selectedField }),
      // ↑ only persist selectedField — fields always re-fetched from DB
    }
  )
);
