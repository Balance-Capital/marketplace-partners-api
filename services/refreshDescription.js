const {  
  productsRefreshDescriptionAI, 
  offersRefreshDescriptionAI } = require('../utils/refreshDescription');

if (process.argv[2] === 'products') {
  productsRefreshDescriptionAI(true, 10, 0).then(() => process.exit());
}

if (process.argv[2] === 'offers') {
  offersRefreshDescriptionAI(true, 10, 0).then(() => process.exit());
}