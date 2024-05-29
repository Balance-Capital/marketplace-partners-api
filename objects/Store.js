const seo = {
    contentLength: Number,
    contentUpdatedAt: Date,
    jarvisContentUpdatedAt: Date,
    dateManualCheck: Date,
    longTail: String
};

const Store = {
    remoteAfiliateNetworkId: String,
    name: String,
    logo: String,
    priority: Number,
    domains: Array,
    domain: String,
    countries: Array,
    country: String,
    categories: Array,
    epc: Number,
    averageCommissionRate: Number,
    averageBasketSize: Number,
    averageConversionRate: Number,
    specialRateType: String,
    offers: Array,
    description: String,
    faq: String,
    aboutOffers: String,
    meta: String,
    offersScore: Object,
    star: Number,
    backup: Array,
    publicIndexing: Date,
    indexing: Boolean,
    isActive: Boolean,
    seo
};

module.exports = Store;