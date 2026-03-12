import { create } from 'zustand';

export type Mini = { id: number; guid: string; name: string; selected: boolean } | null;

// VistaCreate publish payload (use a stricter type if you have one)
export type LabelDesign = any;
export type LabelDesigns = { front: LabelDesign | null; back: LabelDesign | null };
export type LabelHistorySide = 'front' | 'back';
export type LabelVersionKind = 'Initial' | 'Edit' | 'Upload';
export type LabelHistoryEntry = {
  id: string;
  dedupeKey: string;
  side: LabelHistorySide;
  previewUrl: string;
  promptText: string | null;
  editPromptText: string | null;
  versionKind: LabelVersionKind;
  createdAt: string;
  designExport: LabelDesign;
};
export type LabelHistory = { front: LabelHistoryEntry[]; back: LabelHistoryEntry[] };
export type SelectedHistoryId = { front: string | null; back: string | null };

export type ClosurePick = { name: string; hex: string } | null;
export type ClosureChoices = { wood: ClosurePick; wax: ClosurePick };

// Order coming from your parent window message (subset you care about)
export type ParentOrderPayload = {
  bottle: { id: number; guid: string; name: string; selected: boolean };
  liquid: { id: number; guid: string; name: string; selected: boolean };
  closure: { id: number; guid: string; name: string; selected: boolean };
  label: { id: number; guid: string; name: string; selected: boolean };
};

// Local Order in the configurator state
export type Order = {
  sku: string | null;
  price: number | string | null;
  bottleSel: any | null;
  liquidSel: any | null;
  closureSel: any | null;
  labelSel: any | null;
  bottle: Mini;
  liquid: Mini;
  closure: Mini;
  label: Mini;
};

export type OrderState = {
  order: Order;
  labelDesigns: LabelDesigns;
  labelHistory: LabelHistory;
  selectedHistoryId: SelectedHistoryId;
  closureChoices: ClosureChoices;
  setClosureWood: (pick: ClosurePick) => void;
  setClosureWax: (pick: ClosurePick) => void;
  clearClosureChoices: () => void;
  /** existing setter used when you derive selections inside the configurator */
  setFromSelections: (args: {
    selections: {
      bottleSel: any | null; liquidSel: any | null; closureSel: any | null; labelSel: any | null;
      bottle: Mini; liquid: Mini; closure: Mini; label: Mini;
    };
    sku: string | null;
    price: number | string | null;
  }) => void;
  /** persist a design (front/back) coming from VistaCreate */
  setLabelDesign: (side: 'front' | 'back', design: LabelDesign | null) => void;
  /** clear both designs (useful when bottle changes or user resets) */
  clearLabelDesigns: () => void;
  pushLabelHistory: (payload: {
    side: LabelHistorySide;
    previewUrl: string;
    promptText?: string | null;
    editPromptText?: string | null;
    versionKind: LabelVersionKind;
    designExport: LabelDesign;
    dedupeKey?: string | null;
    createdAt?: string;
  }) => void;
  selectLabelHistory: (side: LabelHistorySide, id: string) => void;
  clearLabelHistory: (side?: LabelHistorySide) => void;
  /** convenience: handle the exact parent postMessage payload you showed */
  setFromUploadDesign: (payload: {
    order: ParentOrderPayload;
    designSide: 'front' | 'back';
    designExport: LabelDesign;
  }) => void;
};

export const useOrderStore = create<OrderState>((set, get) => ({
  order: {
    sku: null,
    price: null,
    bottleSel: null,
    liquidSel: null,
    closureSel: null,
    labelSel: null,
    bottle: null,
    liquid: null,
    closure: null,
    label: null,
  },
  labelDesigns: { front: null, back: null },
  labelHistory: { front: [], back: [] },
  selectedHistoryId: { front: null, back: null },
  closureChoices: { wood: null, wax: null },

  setClosureWood: (pick) => set((state) => ({
    closureChoices: { ...state.closureChoices, wood: pick }
  })),
  setClosureWax: (pick) => set((state) => ({
    closureChoices: { ...state.closureChoices, wax: pick }
  })),
  clearClosureChoices: () => set({ closureChoices: { wood: null, wax: null } }),
  

  setFromSelections: ({ selections, sku, price }) =>
    set((state) => {
      const next: Order = {
        sku,
        price,
        bottleSel: selections.bottleSel,
        liquidSel: selections.liquidSel,
        closureSel: selections.closureSel,
        labelSel: selections.labelSel,
        bottle: selections.bottle,
        liquid: selections.liquid,
        closure: selections.closure,
        label: selections.label,
      };

      const prev = state.order;
      const same =
        prev.sku === next.sku &&
        String(prev.price) === String(next.price) &&
        (prev.bottle?.id ?? 0) === (next.bottle?.id ?? 0) &&
        (prev.liquid?.id ?? 0) === (next.liquid?.id ?? 0) &&
        (prev.closure?.id ?? 0) === (next.closure?.id ?? 0) &&
        (prev.label?.id ?? 0) === (next.label?.id ?? 0);

      const bottleChanged = (prev.bottle?.id ?? 0) !== (next.bottle?.id ?? 0);

      if (same && !bottleChanged) return state; // No change, don’t update

      if (bottleChanged) {
        // When bottle changes, UVs/areas differ -> clear designs as they may no longer fit
        return {
          order: next,
          labelDesigns: { front: null, back: null },
          labelHistory: { front: [], back: [] },
          selectedHistoryId: { front: null, back: null },
          closureChoices: { wood: null, wax: null },
        };
      }

      return { order: next };
    }),

  setLabelDesign: (side, design) =>
    set((state) => ({
      labelDesigns: { ...state.labelDesigns, [side]: design },
      selectedHistoryId: { ...state.selectedHistoryId, [side]: null },
    })),

  clearLabelDesigns: () =>
    set({
      labelDesigns: { front: null, back: null },
      labelHistory: { front: [], back: [] },
      selectedHistoryId: { front: null, back: null },
    }),

  pushLabelHistory: ({
    side,
    previewUrl,
    promptText = null,
    editPromptText = null,
    versionKind,
    designExport,
    dedupeKey = '',
    createdAt,
  }) =>
    set((state) => {
      const key = String(dedupeKey || previewUrl || '').trim();
      const list = [...state.labelHistory[side]];
      const existingIndex = key ? list.findIndex((entry) => entry.dedupeKey === key) : -1;
      const existing = existingIndex >= 0 ? list[existingIndex] : null;
      const entry: LabelHistoryEntry = {
        id:
          existing?.id ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        dedupeKey: key || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        side,
        previewUrl: String(previewUrl || '').trim(),
        promptText: promptText ? String(promptText).trim() : null,
        editPromptText: editPromptText ? String(editPromptText).trim() : null,
        versionKind,
        createdAt: createdAt || existing?.createdAt || new Date().toISOString(),
        designExport,
      };

      if (existingIndex >= 0) {
        list[existingIndex] = entry;
      } else {
        list.push(entry);
      }

      const MAX_HISTORY = 12;
      while (list.length > MAX_HISTORY) {
        list.shift();
      }

      return {
        labelDesigns: { ...state.labelDesigns, [side]: designExport },
        labelHistory: { ...state.labelHistory, [side]: list },
        selectedHistoryId: { ...state.selectedHistoryId, [side]: entry.id },
      };
    }),

  selectLabelHistory: (side, id) =>
    set((state) => {
      const entry = state.labelHistory[side].find((version) => version.id === id);
      if (!entry) return state;
      return {
        labelDesigns: { ...state.labelDesigns, [side]: entry.designExport },
        selectedHistoryId: { ...state.selectedHistoryId, [side]: id },
      };
    }),

  clearLabelHistory: (side) =>
    set((state) => {
      if (!side) {
        return {
          labelHistory: { front: [], back: [] },
          selectedHistoryId: { front: null, back: null },
        };
      }
      return {
        labelHistory: { ...state.labelHistory, [side]: [] },
        selectedHistoryId: { ...state.selectedHistoryId, [side]: null },
      };
    }),

  setFromUploadDesign: ({ order: parentOrder, designSide, designExport }) => {
    // 1) persist design
    set((state) => ({ labelDesigns: { ...state.labelDesigns, [designSide]: designExport } }));

    // 2) optionally sync the Mini selections coming from the parent message
    const nextOrderPart: Partial<Order> = {
      bottle: parentOrder?.bottle ?? null,
      liquid: parentOrder?.liquid ?? null,
      closure: parentOrder?.closure ?? null,
      label: parentOrder?.label ?? null,
    };

    set((state) => {
      const prev = state.order;
      const bottleChanged = (prev.bottle?.id ?? 0) !== (nextOrderPart.bottle?.id ?? prev.bottle?.id ?? 0);

      // merge but keep pricing/sku and *Sel fields as-is (your configurator logic owns those)
      const merged: Order = {
        ...prev,
        ...nextOrderPart,
      };

      return bottleChanged
        ? {
          order: merged,
          labelDesigns: { front: null, back: null, [designSide]: designExport } as LabelDesigns,
          labelHistory: { front: [], back: [] },
          selectedHistoryId: { front: null, back: null },
        }
        : { order: merged };
    });
  },
}));
