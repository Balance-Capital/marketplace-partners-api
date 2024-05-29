const Product = {
    importedId: String,
    partnerSource: String,
    advertiserName:String,
    advertiserCountry:String,
    image:String,
    brand: String,
    title: String,
    description:String,    
    price: {
        amount:String,
        currency: String
    },
    salePrice: {
        amount: String,
        currency: String
    },
    link: String,
    categories: Array
};

module.exports = Product;