import assert from "node:assert/strict";
import { buildWhatsAppLink, normalizePhoneBR, renderTemplate } from "../app/lib/whatsapp";

assert.equal(normalizePhoneBR("(11) 91234-5678"), "5511912345678");
assert.equal(normalizePhoneBR("+55 (11) 3123-4567"), "551131234567");
assert.equal(normalizePhoneBR("(55) 91234-5678"), "5555912345678");
assert.equal(normalizePhoneBR("91234-5678"), null);
assert.equal(normalizePhoneBR("+1 (212) 555-0100"), null);
assert.equal(normalizePhoneBR("(00) 91234-5678"), null);
assert.equal(normalizePhoneBR(null), null);

const message = renderTemplate("Olá {cliente}, revisão de {bike} em {data_ultimo}.", {
  cliente: "João", bike: "Caloi & Oggi", data_ultimo: "11/11/2026",
});
const link = new URL(buildWhatsAppLink("(11) 91234-5678", message)!);
assert.equal(link.origin, "https://wa.me");
assert.equal(link.pathname, "/5511912345678");
assert.equal(link.searchParams.get("text"), "Olá João, revisão de Caloi & Oggi em 11/11/2026.");
assert.equal(renderTemplate("{cliente} {bike}", { cliente: "$& {bike}", bike: "Caloi" }), "$& {bike} Caloi");
console.log("WhatsApp: normalização, interpolação e links verificados.");
