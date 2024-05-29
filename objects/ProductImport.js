const ProductImport = {
    adId: String,
    advertiserName: String,
    advertiserCountry: String,
    targetCountry: String,
    additionalImageLink:  Array,
    imageLink: String,
    brand: String,
    advertiserId: String, 
    catalogId: String, 
    id: String, 
    title: String, 
    description: String, 
    price: {amount:String, currency: String},
    salePrice: {amount: String, currency: String},
    salePriceEffectiveDateStart: String,
    salePriceEffectiveDateEnd: String,
    link: String,
    mobileLink: String,
    linkCode: String
};

module.exports = ProductImport;