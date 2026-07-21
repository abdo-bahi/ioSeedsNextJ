import { create } from "zustand"
import { persist } from "zustand/middleware"


type Field = {
  name: string
  crop: string
}

type FieldStore = {
  fields:        Field[]
  selectedField: Field
  setField:      (field: Field) => void
}

export const useFieldStore = create<FieldStore>()(
    persist(
      (set) => ({
        fields: [
          { name: "Parcelle A", crop: "Tomates" },
          { name: "Parcelle B", crop: "Blé" },
          { name: "Parcelle C", crop: "Pommes de terre" },
        ],
        selectedField: { name: "Parcelle A", crop: "Tomates" },
        setField: (field) => set({ selectedField: field }),
        // reset:    () => set({ selectedField: null }),  // ← clears on logout
      }),
      {
        name: "ioseeds-field-store",
        partialize: (state) => ({ selectedField: state.selectedField }),
      }
    )
  )