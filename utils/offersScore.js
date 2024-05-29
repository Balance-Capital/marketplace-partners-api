const { 
    PERCENTAGE, 
    SIGN_PERCENTAGE 
} = require('../constants/offersValueType');

const avgSavings = (offers) => offers[0] && offers[0].value
    ? `${Math.ceil(parseFloat(
        offers[0].value / offers.filter(item=>item.valueType === offers[0].valueType).length
        ))}${
        offers[0].valueType === PERCENTAGE ? SIGN_PERCENTAGE : ''
      }`
    : null;

const offersScoreFunction = (offers) => ({
    bestDiscount: offers[0] && offers[0].value
      ? `${offers[0].value}${
          offers[0].valueType === PERCENTAGE ? SIGN_PERCENTAGE : ''
        }`
      : null,
    couponCodes: offers.filter((item) => item.code !== '').length,
    totalOffers: offers.length || null,
    avgSavings: avgSavings(offers)
});


module.exports = {
    offersScoreFunction
};