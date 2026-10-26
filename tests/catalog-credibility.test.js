jest.mock("query-string", () => ({ __esModule: true, default: {} }));
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StockBadge from "@/components/shared/product/stock-badge";
import ReviewSummary from "@/components/shared/product/review-summary";
import ProductCard from "@/components/shared/product/product-card";
import RelatedCard from "@/components/shared/product/product-card2";
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test.each([0, -1, NaN, undefined, 6, 100, 1.5])("stock %s never invents a sales or scarcity badge", stock => {
 expect(render(StockBadge,{stock})).toBe("");
});
test.each([1,5])("low stock %s reflects actual inventory consistently", stock => {
 const first=render(StockBadge,{stock});
 expect(first).toContain(`Zipo ${stock} tu!`);
 for(let i=0;i<10;i++) expect(render(StockBadge,{stock})).toBe(first);
 expect(first).not.toContain("zimeuzika");
});
test("zero reviews is a neutral state rather than a zero-star rating",()=>{
 const html=render(ReviewSummary,{rating:0,numReviews:0});
 expect(html).toContain("Bado hakuna maoni"); expect(html).not.toContain("<svg");
});
test.each([{}, {rating:NaN,numReviews:2}, {rating:4,numReviews:-1}, {rating:6,numReviews:1}])("missing/invalid review summaries are not fabricated",props=>{
 const html=render(ReviewSummary,props); expect(html).toContain("Maoni hayajapatikana"); expect(html).not.toContain("<svg");
});
test("real summary has a complete accessible label",()=>{
 const html=render(ReviewSummary,{rating:3.5,numReviews:2});
 expect(html).toContain('aria-label="Maoni 2: 3.5 kati ya 5"');
 expect(html).toContain('(Maoni 2)');
});
test("both card variants omit unsupported review/sales claims",()=>{
 const product={id:'fixture',slug:'fixture',name:'Fixture',brand:'Test',category:'Test',subcategory:'',supplier:'Test',images:['/images/logo.svg'],price:1000,stock:30};
 for(const html of [render(ProductCard,product),render(RelatedCard,{product})]) {
  expect(html).not.toContain('(12)'); expect(html).not.toContain('zimeuzika');
  expect(html).not.toContain('text-yellow-500'); expect(html).toContain('Fixture');
 }
});
test('non-monotonic bulk tiers advertise an exact quantity, not all higher quantities',()=>{
 const html=render(ProductCard,{id:'fixture',slug:'fixture',name:'Fixture',brand:'Test',category:'Test',supplier:'Test',images:[],price:1000,stock:30,pricingTiers:[{minQty:5,price:800},{minQty:10,price:900}]});
 expect(html).toContain('ukiagiza 5 pcs');expect(html).not.toContain('5+');
});
