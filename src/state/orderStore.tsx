import { create } from 'zustand';

export type Mini = { id: number; guid: string; name: string; selected: boolean } | null;

type Order = {
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

type OrderState = {
  order: Order;
  setFromSelections: (args: {
    selections: {
      bottleSel: any | null; liquidSel: any | null; closureSel: any | null; labelSel: any | null;
      bottle: Mini; liquid: Mini; closure: Mini; label: Mini;
    };
    sku: string | null;
    price: number | string | null;
  }) => void;
};

export const useOrderStore = create<OrderState>((set) => ({
  order: {
    sku: null, price: null,
    bottleSel: null, liquidSel: null, closureSel: null, labelSel: null,
    bottle: null, liquid: null, closure: null, label: null,
  },
  setFromSelections: ({ selections, sku, price }) =>
    set(() => ({
      order: {
        sku, price,
        bottleSel: selections.bottleSel,
        liquidSel: selections.liquidSel,
        closureSel: selections.closureSel,
        labelSel: selections.labelSel,
        bottle: selections.bottle,
        liquid: selections.liquid,
        closure: selections.closure,
        label: selections.label,
      }
    })),
}));