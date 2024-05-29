const {refreshOffersTitleAI,refreshProductsTitleAI} = require('../utils/refreshTitle');

if(process.argv[2] === 'offers') {
    refreshOffersTitleAI(true, 1, 0).then(() => process.exit());
};

if(process.argv[2] === 'products') {
    refreshProductsTitleAI(true, 10, 3470).then(() => process.exit());
};