/* eslint-disable camelcase */
const moment = require('moment');
const { ADSERVICE_AN } = require('../constants/partnersName');
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

const AdServiceANResponse = (offers) =>
  Promise.all(
    offers.map(async (offer) => {
      const {
        begins,
        camp_title,
        campaign_logo,
        categories,
        cleanlink_url,
        currency,
        description,
        expirestamp,
        redirect_url,
        id
      } = offer;

      const origin = cleanlink_url || null;

      const unicodeTitle = isUnicodeDefault(camp_title) ? camp_title : origin;

      const countryInfo =
        currency &&
          countries.filter(
            (country) =>
              country.currency.currencyCode === currency.toUpperCase()
          );

      const descriptionOrNull = getValueOrNull(
        description,
        camp_title || null
      );
      const titleOrDescription = getValueOrNull(unicodeTitle, descriptionOrNull);
      const parserValue = parserOfferValue(
        titleOrDescription,
        countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null
      );
      const shortTitle = parserShortTitle(titleOrDescription);

      const newOffer = Object.create(Offer);
      
      try {
        newOffer.categories = categories || null;
        newOffer.code = null;
        newOffer.countryCode = (countryInfo && countryInfo[0] && [countryInfo[0].code]) || null;
        newOffer.country = (countryInfo && countryInfo[0] && [countryInfo[0].name]) || null;
        newOffer.currency = countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null;
        newOffer.value = parserValue && parserValue.value || null;
        newOffer.valueType = parserValue && parserValue.valueType || null;
        newOffer.verified = false;
        newOffer.validDate = expirestamp && moment(expirestamp).toISOString() || moment(begins).add(6, 'months').toISOString();
        newOffer.startDate = begins && moment(begins).toISOString() || null;
        newOffer.image = campaign_logo || null;
        newOffer.savingType = null;
        newOffer.storeUrl = cleanlink_url;
        newOffer.title = unicodeTitle || null;
        newOffer.shortTitle = shortTitle || unicodeTitle || null;
        newOffer.description = descriptionOrNull || null;
        newOffer.origin = origin || null;
        newOffer.domains = [cleanlink_url] || null;
        newOffer.originId = id || null;
        newOffer.redirectUrl = redirect_url || null;
        newOffer.merchantId = null;
        newOffer.stars = getRangeRnd(3, 5);
        newOffer.advertiserName = origin || null;
        newOffer.partnerSource = ADSERVICE_AN;  
      } catch (error) {
        logger.error(error);
      }
      return newOffer;
    })
  ).then(results => results);

module.exports = AdServiceANResponse;
