export function merchantSearchName(description:string){
 return description.replace(/^(?:IOF|juros|tarifa)\s+(?:de|do|da)\s*/i,'').replace(/["“”]/g,'').replace(/^[•●*]{4}\s*\d{4}\s*/,'').replace(/^(?:izi|mp|pag|pg|sumup|paypal|dl)\s*\*\s*/i,'').replace(/\s*[-–]?\s*parcela\s+\d+\s*\/\s*\d+.*$/i,'').replace(/\s+/g,' ').trim().slice(0,160);
}
export function merchantKey(description:string){
 if(/^(?:iof|juros|tarifa|multa|saldo|pagamento|pagto|pgto|pix|transfer[eê]ncia|estorno|reembolso)\b/i.test(description.trim()))return null;
 const key=merchantSearchName(description).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 return key.length>=4?key:null;
}
export function merchantSearchLinks(name:string,location=''){
 const query=[name.trim(),location.trim()].filter(Boolean).join(' ');
 return {google:'https://www.google.com/search?q='+encodeURIComponent(query),maps:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)};
}
export function placeCategory(types:string[]):string|null{
 const has=(...keys:string[])=>keys.some(k=>types.includes(k));
 if(has('supermarket','grocery_store','food_store'))return 'Mercado';
 if(types.some(t=>t.endsWith('_restaurant'))||has('ice_cream_shop','dessert_shop','dessert_restaurant','acai_shop','juice_shop','restaurant','cafe','bakery','meal_delivery','meal_takeaway','bar','coffee_shop'))return 'Restaurantes';
 if(has('bus_station','transit_station','train_station','taxi_stand','gas_station','subway_station'))return 'Transporte';
 if(has('lodging','hotel','travel_agency','tourist_attraction'))return 'Viagens';
 if(has('optician','optical_store'))return 'Saúde';
 if(has('pharmacy','drugstore','hospital','doctor','dentist'))return 'Saúde';
 if(has('school','university','library'))return 'Educação';
 if(has('movie_theater','amusement_park','night_club','bowling_alley'))return 'Lazer';
 if(has('clothing_store','electronics_store','department_store','shopping_mall','shoe_store'))return 'Compras';
 return null;
}
export type MerchantCandidate={id:string;name:string;address:string;category:string|null;url:string;confidence?:'alta'|'media'|'baixa';matchReason?:string;categorySource?:'google'|'description'};
