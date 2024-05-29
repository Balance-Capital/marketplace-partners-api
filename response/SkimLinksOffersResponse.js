const { SKIM_LINKS } = require('../constants/partnersName');
const Offer = require('../objects/Offer');
const countries = require('../constants/countries.json');

const REGEXP_COM = new RegExp('.*\\.com');

const logger = require('../services/logger');
const configController = require('../controllers/ConfigController');
const {
  getValueOrNull,
  parserOfferValue,
  parserShortTitle,
  parserRedirectUrl
} = require('../utils/getValue');

const { getRangeRnd } = require('../utils/math');
const { isUnicodeDefault } = require('../utils/unicode');

const skimLinksOffersResponse = (offers) =>
  Promise.all(
    offers.map(async (offer) => {
      const {
        merchantDetailsCountries,
        merchantDetailsDomain,
        merchantDetailsDomains,
        merchantDetailsMetadata,
        merchantDetailsMerchantId,
        merchantDetailsName,
        merchantDetailsVerticals,
        couponCode,
        description,
        id,
        offerEnds,
        offerStarts,
        title,
        url
      } = offer;

      const skimLinksConfig = await configController.get(
        { name: SKIM_LINKS },
        { ourId: 1, urlTemplate: 1 }
      );

      const origin = merchantDetailsDomain.match(REGEXP_COM) 
        ? merchantDetailsDomain
        : (()=>{
          const originFilterCom = merchantDetailsDomains.filter(item => item.match(REGEXP_COM))[0];
          if(!originFilterCom)
            return merchantDetailsDomains[0];
          return originFilterCom;
         })();

      const unicodeTitle = isUnicodeDefault(title) ? title : origin;

      const countryInfo =
        merchantDetailsCountries &&
        countries.filter(
          (country) =>
            country.name === merchantDetailsCountries[0].toUpperCase()
        );

      const descriptionOrNull = getValueOrNull(
        description,
        merchantDetailsMetadata && merchantDetailsMetadata.description || null
      );
      const titleOrDescription = getValueOrNull(unicodeTitle, descriptionOrNull);
      const parserValue = parserOfferValue(
        titleOrDescription,
        countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null
      );
      const shortTitle = parserShortTitle(titleOrDescription);
      const redirectUrl = parserRedirectUrl(
        skimLinksConfig[0].urlTemplate,
        skimLinksConfig[0].ourId,
        url
      );

      const newOffer = Object.create(Offer);
      try {
        newOffer.categories = merchantDetailsVerticals || null;
        newOffer.code = couponCode || null;
        newOffer.countryCode = (countryInfo && countryInfo[0] && [countryInfo[0].code]) || null;
        newOffer.country = (countryInfo && countryInfo[0] && [countryInfo[0].name]) || null;
        newOffer.currency = countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null;
        newOffer.value = parserValue && parserValue.value || null;
        newOffer.valueType = parserValue && parserValue.valueType || null;
        newOffer.verified = false;
        newOffer.validDate = offerEnds || null;
        newOffer.startDate = offerStarts || null;
        newOffer.image = merchantDetailsMetadata && merchantDetailsMetadata.logo || null;
        newOffer.savingType = null;
        newOffer.storeUrl = null;
        newOffer.title = unicodeTitle || null;
        newOffer.shortTitle = shortTitle || unicodeTitle || null;
        newOffer.description = descriptionOrNull || null;
        newOffer.origin = origin || null;
        newOffer.domains = merchantDetailsDomains || null;
        newOffer.originId = id || null;
        newOffer.redirectUrl = redirectUrl || null;
        newOffer.merchantId = merchantDetailsMerchantId || null;
        newOffer.stars = getRangeRnd(3, 5);
        newOffer.advertiserName = merchantDetailsName || null;
        newOffer.partnerSource = SKIM_LINKS;  
      } catch (error) {
        logger.warning(`[SkimLinksOffersResponse] new offer make ${error?.message}`, error);
      }
      return newOffer;
    })
  ).then(results => results);

module.exports = skimLinksOffersResponse;
