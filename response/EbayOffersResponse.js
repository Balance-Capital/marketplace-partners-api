const { EBAY } = require('../constants/partnersName');
const countries = require('../constants/countries.json');

const { eBayCategory, getId } = require('../services/ebay');
const Offer = require('../objects/Offer');
const logger = require('../services/logger');
const { isUnicodeDefault } = require('../utils/unicode');

const {
  getValueOrNull,
  parserOfferValue,
  parserShortTitle
} = require('../utils/getValue');

const { getRangeRnd } = require('../utils/math');

const eBayOffersResponse = (offers) =>
  Promise.all(
    offers.map(async (offer) => {
      const {
       itemId,
       title,
       image,
       dealStartDate,
       dealEndDate,
       categoryId,
       price,
       legacyItemId,
       dealAffiliateWebUrl      
      } = offer;

      const countryInfo =
      price && price.currency &&
        countries.filter(
          (country) =>
            country.code === 'US'
        );
      
      const unicodeTitle = isUnicodeDefault(title) ? title : 'ebay.com';

      const descriptionOrNull = getValueOrNull(
        unicodeTitle,
        null
      );
      const titleOrDescription = getValueOrNull(unicodeTitle, descriptionOrNull);
      const parserValue = parserOfferValue(
        titleOrDescription,
        countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null
      );
      const shortTitle = parserShortTitle(titleOrDescription);

      const category = [await eBayCategory(categoryId)];
      const domains = ['ebay.com'];
      const couponCode = null;

      const newOffer = Object.create(Offer);
      try {
        newOffer.categories = category || null;
        newOffer.code = couponCode || null;
        newOffer.countryCode = (countryInfo && countryInfo[0] && [countryInfo[0].code]) || null;
        newOffer.country = (countryInfo && countryInfo[0] && [countryInfo[0].name]) || null;
        newOffer.currency = countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null;
        newOffer.value = parserValue && parserValue.value || null;
        newOffer.valueType = parserValue && parserValue.valueType || null;
        newOffer.verified = false;
        newOffer.validDate = dealEndDate || null;
        newOffer.startDate = dealStartDate || null;
        newOffer.image = image.imageUrl || null;
        newOffer.savingType = null;
        newOffer.storeUrl = null;
        newOffer.title = unicodeTitle || null;
        newOffer.shortTitle = shortTitle || unicodeTitle || null;
        newOffer.description = descriptionOrNull || null;
        newOffer.origin = domains[0] || null;
        newOffer.domains = domains || null;
        newOffer.originId = legacyItemId || getId(itemId) || null;
        newOffer.redirectUrl = dealAffiliateWebUrl || null;
        newOffer.merchantId = legacyItemId || null;
        newOffer.stars = getRangeRnd(3, 5);
        newOffer.advertiserName = 'eBay' || null;
        newOffer.partnerSource = EBAY;  
      } catch (error) {
        logger.error(error);
      }
      return newOffer;
    })
  ).then(results => results);

module.exports = eBayOffersResponse;
