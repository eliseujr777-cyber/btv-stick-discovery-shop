import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { whatsappLink } from "@/lib/format";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      BTV<span className="text-primary">STICK</span>
    </span>
  );
}

export function SiteHeader() {
  const { count, setOpen } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" aria-label="BTV Stick – início">
          <Logo />
        </a>
        <nav className="flex items-center gap-2 sm:gap-6">
          <a href="#beneficios" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Benefícios
          </a>
          <a href="#produtos" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Produtos
          </a>
          <a
            href={whatsappLink("Olá! Quero saber mais sobre o BTV Stick.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-whatsapp px-4 py-2 text-sm font-semibold text-whatsapp-foreground transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon /> <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Abrir carrinho (${count} itens)`}
            className="relative grid size-10 place-items-center rounded-full border border-border transition-colors hover:bg-secondary"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
