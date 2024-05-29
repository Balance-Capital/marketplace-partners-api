const { COMMISSION_JUNCTION } = require('../constants/partnersName');
const countries = require('../constants/countries.json');

const REGEXP_COM = new RegExp('.*\\.com');

// const { uploadObject } = require('../services/spaceDigitalOcean');
// const { getImageFromRemoteServer } = require('../utils/remoteFiles');

const Offer = require('../objects/Offer');

const logger = require('../services/logger');

const {
  getValueOrNull,
  parserOfferValue,
  // parserShortTitle,
  // parserShortTitleAI,
  // parserCJImage,
  // parserCJredirectUrl
} = require('../utils/getValue');

const { makeTitleAI } = require('../utils/makeTitle');
const { cleanHtml } = require('../utils/cleanHtml');

const {
  PRODUCT, COUPON, DEAL
} = require('../constants/offerType')

const { getRangeRnd } = require('../utils/math');
const { isUnicodeDefault } = require('../utils/unicode');

const commissionJunctionOffersResponse = (offers) =>
  Promise.all(
    offers.map(async (offer) => {
      const {
        advertiserId,
        category,
        language,
        description,
        destination,
        linkId,
        linkName,
        promotionEndDate,
        promotionStartDate,
        promotionType,
        couponCode,
        domains,
        advertiserName,
        linkCodeHtml,
        saleCommission,
        linkType,
        clickUrl,
        countryCode
      } = offer;

      if(!domains) return undefined;

      const countryInfo =
        language &&
        countries.filter(
          (country) => country.language === language[0].toUpperCase()
        );

      const originFilterCom = domains?.filter(item => item.match(REGEXP_COM))[0];
      const origin = originFilterCom || domains[0];  
      const unicodeTitle = (()=>{
        if(isUnicodeDefault(description)) {
          return cleanHtml(description);
        } if(isUnicodeDefault(linkName) && linkType !== 'Banner') {
          return cleanHtml(linkName);
        } 
        return origin;
      })().replace(/[_-]?\d{1,}.?x.?\d{1,}/,''); 
      
      const descriptionOrNull = getValueOrNull(cleanHtml(description), '').replace(/[_-]?\d{1,}.?x.?\d{1,}/,'');
      const titleOrDescription = getValueOrNull(unicodeTitle, descriptionOrNull);
      const parserValue = parserOfferValue(
        titleOrDescription,
        countryInfo && countryInfo[0] && countryInfo[0].currency.currencySymbol || null
      );
      const shortTitle = await makeTitleAI(unicodeTitle, titleOrDescription);
      // const redirectUrl = parserCJredirectUrl(linkCodeHtml, destination);
      const redirectUrl = `${clickUrl}?sid={sessionId}`;
      // const imageFromBanner = parserCJImage(linkCodeHtml);

      // const remoteFile = await getImageFromRemoteServer(imageFromBanner,origin);
      // const params = {
      //   Bucket: process.env.S3_BUCKET_NAME,
      //   Key: remoteFile.pathAndName,
      //   Body: remoteFile.fileData,
      //   ACL: "public-read",
      //   CacheControl: 'public,max-age=864000'
      // };
      // if(remoteFile.fileData) await uploadObject(params);

      const newOffer = Object.create(Offer);
      try {
        newOffer.linkType = linkType; 
        newOffer.categories = category || null;
        newOffer.code = couponCode || null;
        newOffer.countryCode = countryCode || (countryInfo && countryInfo[0] && [countryInfo[0].code]) || null;
        newOffer.country = (countryInfo && countryInfo[0] && [countryInfo[0].name]) || null;
        newOffer.verified = false;
        newOffer.validDate = promotionEndDate || null;
        newOffer.startDate = promotionStartDate || null;
        newOffer.value = parserValue && parserValue.value || null;
        newOffer.valueType = parserValue && parserValue.valueType || null;
        newOffer.currency = parserValue && parserValue.currencySymbol || null;
        // newOffer.image = remoteFile.pathAndName;
        newOffer.savingType = promotionType === 'N/A' ? null : promotionType;
        newOffer.storeUrl = null;
        newOffer.title = cleanHtml(linkName) || null;
        newOffer.shortTitle = shortTitle || null;
        newOffer.description = descriptionOrNull || null;
        newOffer.origin = origin || null;
        newOffer.domains = domains || null;
        newOffer.originId = linkId || null;
        newOffer.redirectUrl = redirectUrl || destination || null;
        newOffer.merchantId = advertiserId || null;
        newOffer.stars = getRangeRnd(3, 5);
        newOffer.advertiserName = advertiserName || null;
        newOffer.partnerSource = COMMISSION_JUNCTION;
        newOffer.salesCommission = saleCommission || null;
        newOffer.offerType = promotionType === 'Product' ? PRODUCT : !newOffer.code ? DEAL : COUPON;
      } catch(error) {
        logger.warning(`[CommissionJunctionOffersResponse] ${error?.message}`, error);
      };

      return newOffer;
    })
  ).then(results => results.filter((item) => item !== undefined));

module.exports = commissionJunctionOffersResponse;
