import { describe, expect, it } from "vitest";
import { installmentCents, isValidCPF, MAX_INSTALLMENTS } from "./format";

describe("parcelamento", () => {
  it("parcela em até 10x sem juros", () => {
    expect(MAX_INSTALLMENTS).toBe(10);
  });
  it("BTV Stick 4K (R$ 299,90) sai 10x de R$ 29,99", () => {
    expect(installmentCents(29990)).toBe(2999);
  });
  it("BTV Stick Lite (R$ 199,90) sai 10x de R$ 19,99", () => {
    expect(installmentCents(19990)).toBe(1999);
  });
});

describe("CPF", () => {
  it("aceita CPF válido", () => {
    expect(isValidCPF("123.456.789-09")).toBe(true);
  });
  it("recusa CPF com dígito errado", () => {
    expect(isValidCPF("123.456.789-00")).toBe(false);
  });
});
