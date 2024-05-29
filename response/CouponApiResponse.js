/* eslint-disable camelcase */
const { COUPON_API } = require('../constants/partnersName');
const Offer = require('../objects/Offer');
const countries = require('../constants/countries.json');
const logger = require('../services/logger');

const {
  getValueOrNull,
  parserOfferValue,
  parserShortTitle
} = require('../utils/getValue');

const { getRangeRnd } = require('../utils/math');
const { isUnicodeDefault } = require('../utils/unicode');

const couponApiResponse = (offers) =>
  Promise.all(
    offers.map(async (offer) => {
      const {
        offer_id,
        title,
        description,
        code,
        brand_logo,
        store,
        categories,
        start_date,
        end_date,
        primary_location,
        cashback_link
      } = offer;

      const origin = store;

      const unicodeTitle = isUnicodeDefault(title) ? title : origin;

      const countryInfo = primary_location === 'multi country' 
        ? countries.filter(
          (country) =>
            country.name === 'UNITED STATES'
        )
        : (() => {
          const primaryCountry = primary_location.split(',')[0]
          return primaryCountry &&
          countries.filter(
            (country) =>
              country.name === primaryCountry.toUpperCase()
          );
  
        }) 

      const descriptionOrNull = getValueOrNull(
        description,
        unicodeTitle || null
      );
      const titleOrDescription = getValueOrNull(unicodeTitle, descriptionOrNull);
      const parserValue = parserOfferValue(
        titleOrDescription,
        countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null
      );
      const shortTitle = parserShortTitle(titleOrDescription);
      const redirectUrl = cashback_link.replace(/\{\{replace_userid_here\}\}/gui, '{sessionId}');

      const newOffer = Object.create(Offer);
      try {
        newOffer.categories = categories && categories.split(',') || null;
        newOffer.code = code || null;
        newOffer.countryCode = (countryInfo && countryInfo[0] && [countryInfo[0].code]) || null;
        newOffer.country = (countryInfo && countryInfo[0] && [countryInfo[0].name]) || null;
        newOffer.currency = countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null;
        newOffer.value = parserValue && parserValue.value || null;
        newOffer.valueType = parserValue && parserValue.valueType || null;
        newOffer.verified = false;
        newOffer.validDate = end_date || null;
        newOffer.startDate = start_date || null;
        newOffer.image = brand_logo || null;
        newOffer.savingType = null;
        newOffer.storeUrl = null;
        newOffer.title = unicodeTitle || null;
        newOffer.shortTitle = shortTitle || unicodeTitle || null;
        newOffer.description = descriptionOrNull || null;
        newOffer.origin = origin || null;
        newOffer.domains = [origin] || null;
        newOffer.originId = offer_id || null;
        newOffer.redirectUrl = redirectUrl || null;
        newOffer.merchantId = null;
        newOffer.stars = getRangeRnd(3, 5);
        newOffer.advertiserName = store || null;
        newOffer.partnerSource = COUPON_API;  
      } catch (error) {
        logger.error(error);
      }
      return newOffer;
    })
  ).then(results => results);

module.exports = couponApiResponse;
