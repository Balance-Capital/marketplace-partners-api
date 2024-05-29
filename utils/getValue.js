// const { AIClient, requestObject } = require('p4u-client-ai');
const { CURRENCY, PERCENTAGE } = require("../enums/offerValueType");

const getValueOrNull = (val1, val2) => {
    const value1 = val1 || null; 
    const value2 = val2 || null;
    return value1 || value2;
};

const parserOfferValue = (text, currSymbol=null) => {

    let value = null;
    let valueType = null;
    let currencySymbol = currSymbol;

    if(text === null) {
        return {
            value: null,
            valueType: null,
            currencySymbol    
        };
    }

    const regExpPercentage = new RegExp(`\\d+%`,'gi');
    const matchPercent = text.match(regExpPercentage);
    const valuePercentage = matchPercent 
        ? matchPercent
            .map(item => parseFloat(item.replace('%','').trim()))
            .sort((a,b) => a+b)
        : matchPercent
        ;

    const regExpCurrency = currSymbol 
        ? new RegExp(`\\${currSymbol}\\d+((\\.|,)\\d{1,2})?[^%]`,'gi')
        : new RegExp(`(.[^%|\\d+|\\s+]*)?\\d+[^%]`,'gi');    
    const matchCurrency = text.match(regExpCurrency);
    const valueCurrency = matchCurrency
        ? matchCurrency
            .map(item => item.replace(new RegExp(`\\${currSymbol}`),'').replace(new RegExp(`,`),''))
            .sort((a,b) => a+b)
        : matchCurrency
        ;

    if( valuePercentage && valuePercentage[0]) {
        value = parseFloat( valuePercentage[0] );
        valueType = PERCENTAGE;
        currencySymbol = currSymbol || null;
    } 

    if( valueCurrency && valueCurrency[0] &&  value === null) {
        value = parseFloat( valueCurrency[0] );
        valueType = CURRENCY;
        currencySymbol = currSymbol || valueCurrency[1] || valueCurrency[3] || null;
    }

    return {
        value: (value === 0 || (valueType === PERCENTAGE && value === 100) ) 
            ? null 
            : value,
        valueType,
        currencySymbol
    };
};

// const parserShortTitleAI = async (value) => {
//     try {
//         const apiKey = process.env.P4U_CLIENT_AI_KEY || null;
//         const taskId = process.env.P4U_TITLE_TASK_ID || null;
//         if(!apiKey || !taskId) return;
//         const client = new AIClient(apiKey);
//         const request = requestObject;
//         request.idTask = taskId;
//         request.context = ' ';
//         request.ask = value;
//         const response = await client.runTask(request);
//         return response?.data?.text || value;    
//     } catch(err) {
//         return value;
//         console.log(err)
//     }
// };

const parserShortTitle = (value) => {        
    if(!value) return null;
    let match; let result = '';
    match = value.match(/.*\s+(off|over|discount|shipping|save)/gi);
    if(!match) match = value.match(/(now only|off|discount|shipping|save).[^valid]*/gi);
    match = match && match[0].split(' ');
    if(match) {
        match.forEach( (item, index) => {
            if(index > 6) return;
            result += `${item} `;
        })
    }

    if(!result) {
        value.split(' ').forEach( (item, index) => {
            if(index > 1) return;
            result += `${item} `;
        });
    }

    return result.trim();
}

const parserRedirectUrl = (templateUrl, id, url, sessionId) => {
    let result = templateUrl
        .replace('{ourId}',id)
        .replace('{encodedOfferUrl}', encodeURIComponent(url));
    if(sessionId)
        result = result.replace('{sessionId}',sessionId);
    return result;
}

const parserCJImage = (image) => {
    const result = image.match(/(http.[^ |"]*)/gi);
    return result[1];
}

const parserCJredirectUrl = (html, dest) => {
    const result = html.match(/(http.[^ |"]*)/gi);
    const params = result[0].split('-');
    const pid = params[1];
    const aid = params[2];
    const lastUpdatedDate = params[3];
    const url = dest.match(/\?/) 
        ? `${dest}?sid={sessionId}&pid=${pid}&aid=${aid}&lastUpdatedDate=${lastUpdatedDate}`
        : `${dest}?sid={sessionId}&pid=${pid}&aid=${aid}&lastUpdatedDate=${lastUpdatedDate}`
        ;
    return url;
}

module.exports = { 
    getValueOrNull, 
    parserOfferValue, 
    parserShortTitle, 
    // parserShortTitleAI,
    parserRedirectUrl,
    parserCJImage,
    parserCJredirectUrl    
};