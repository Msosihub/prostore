const {productStructuredData,jsonLd,productPath,noindexPath,demoOrigin,unitPrice,isPublicProduct,xmlEscape}=require('../lib/storefront-seo');
const product={name:'Synthetic product',slug:'a b',description:'<p>Real description</p>',images:[],price:'1000',stock:2};
test('valid availability and canonical quantity-one offer; no invented policy or reviews',()=>{
 const schema=productStructuredData({...product,pricingTiers:[{minQty:1,price:900},{minQty:5,price:700}]});
 expect(schema.offers.availability).toBe('https://schema.org/InStock');
 expect(schema.offers.price).toBe('900.00'); expect(schema.offers.priceCurrency).toBe('TZS');
 expect(schema.offers.url).toMatch(/\/product\/a%20b$/);
 expect(schema).not.toHaveProperty('aggregateRating');expect(schema.offers).not.toHaveProperty('shippingDetails');expect(schema.offers).not.toHaveProperty('hasMerchantReturnPolicy');
 expect(productStructuredData({...product,stock:0}).offers.availability).toBe('https://schema.org/OutOfStock');
});
test.each(['', '   '])('incomplete catalog names excluded %p',name=>expect(isPublicProduct({...product,name})).toBe(false));
test.each([0,-1,Infinity,'invalid'])('invalid price excluded %p',price=>expect(productStructuredData({...product,price})).toBeNull());
test('bulk price does not become quantity-one claim',()=>expect(unitPrice({...product,pricingTiers:[{minQty:5,price:700}]})).toBe(1000));
test('JSON-LD text cannot terminate script',()=>{const input={name:'</script><script>alert(1)</script>'};expect(jsonLd(input)).not.toContain('<');expect(JSON.parse(jsonLd(input))).toEqual(input)});
test.each(['/admin','/supplier/products','/buyer/messages','/user/orders','/order/a','/cart','/api/auth','/place-order2'])('private path noindex %s',path=>expect(noindexPath(path)).toBe(true));
test.each(['/','/search','/categories/x','/product/item','/company/x/home'])('public catalog path indexable %s',path=>expect(noindexPath(path)).toBe(false));
test('local demo excluded and XML safely encoded',()=>{expect(demoOrigin('127.0.0.1')).toBe(true);expect(xmlEscape('&<"')).toBe('&amp;&lt;&quot;');expect(productPath('a/b')).toBe('/product/a%2Fb')});
