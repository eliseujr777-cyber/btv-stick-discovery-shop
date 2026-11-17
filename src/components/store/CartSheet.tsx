import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatBRL, installmentCents, MAX_INSTALLMENTS } from "@/lib/format";
import posterAsset from "@/assets/btv-stick-poster.png.asset.json";

export function CartSheet({ onCheckout }: { onCheckout: () => void }) {
  const { items, open, setOpen, count, subtotalCents, setQuantity, remove } = useCart();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="font-display text-xl">Seu carrinho</SheetTitle>
          <SheetDescription>
            {count} {count === 1 ? "item" : "itens"} · frete grátis
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <ShoppingCart className="size-10" />
            <p>Seu carrinho está vazio.</p>
            <a href="#produtos" onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">
              Ver modelos
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto p-6">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
                  <img src={product.image_url ?? posterAsset.url} alt="" className="size-16 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBRL(product.price_cents)} cada</p>
                      </div>
                      <button type="button" onClick={() => remove(product.id)} aria-label={`Remover ${product.name}`} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-border">
                        <button type="button" aria-label="Diminuir" onClick={() => setQuantity(product.id, quantity - 1)} className="grid size-8 place-items-center">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                        <button type="button" aria-label="Aumentar" onClick={() => setQuantity(product.id, quantity + 1)} className="grid size-8 place-items-center">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-semibold">{formatBRL(product.price_cents * quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border p-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatBRL(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Frete</span>
                <span className="font-semibold text-accent">Grátis</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatBRL(subtotalCents)}</span>
              </div>
              <p className="text-xs text-primary">
                ou até {MAX_INSTALLMENTS}x de {formatBRL(installmentCents(subtotalCents))} sem juros
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCheckout();
                }}
                className="mt-3 w-full rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
              >
                Finalizar compra
              </button>
              <p className="text-center text-xs text-muted-foreground">Cartão de crédito em até {MAX_INSTALLMENTS}x via Mercado Pago</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
