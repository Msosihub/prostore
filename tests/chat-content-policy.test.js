import { containsContact } from "@/lib/chat-content-policy";
test.each([
  "07:12:34:56:78",
  "telegram sellername",
  "0712 345 678",
  "+255(712)-345-678",
  "０７１２３４５６７８",
  "٠٧١٢٣٤٥٦٧٨",
  "0\u200b7\u200b12345678",
  "zero seven one two three four five six seven eight",
  "sifuri saba moja mbili tatu nne tano sita saba nane",
  "name@example.com",
  "name [at] example [dot] com",
  "name (at) example (dot) com",
  "name%40example.com",
  "name&#64;example.com",
  "@seller_name",
  "https://example.test/pay",
  "hxxps://example.test",
  "wa.me/255712345678",
  "w w w . e x a m p l e . c o m",
  "telegram: sellername",
  "instagram = seller_name",
])("blocks contact disguise without logging text (%#)", (value) =>
  expect(containsContact(value)).toBe(true),
);
test.each([
  "Nahitaji 5 vipande",
  "Bei ya vipande 10 ni TSh 1,500?",
  "Naomba rangi nyekundu",
  "Agizo #a895ab3",
  "Namba ya bidhaa ABC-123",
  "Tano kwa 800 TZS",
  "Tuma pendekezo la mfumo",
  "Usitume namba ya WhatsApp hapa.",
])("allows product discussion (%#)", (value) =>
  expect(containsContact(value)).toBe(false),
);
