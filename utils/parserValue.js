const cleanString = input => input.map(char => char.charCodeAt(0) <= 127 ? char : '').join('');        

const parserSeoUrl = (value) => {
    if(value) {
        const text = cleanString(value.toString().split(''));
        const clear =  text.replace(/;+|#+|"+|-+|=+|\n+|\r+|>+|<+|\[+|\]+|@+|”+|®+|\?+|'+|:+|%+|\$+|£+|€+|&+|\++|!+|,+|\.+|\|+|!+|\(+|\)+|\/+/gui,'').toLowerCase();
        return clear.replace(/\s+/g,'-');    
    };
    return null;
}

const parserRedirectUrl = (templateUrl, sessionId) => {
    const result = templateUrl && templateUrl.replace('{sessionId}',sessionId);
    return result;
};

const parserShortTitle = (value) => {
    if(!value) return null;
    let match; let result = '';
    match = value.match(/.*\s+(off|discount|shipping|save)/gi);
    if(!match) match = value.match(/(now only|off|discount|shipping|save).[^valid]*/gi);
    match = match && match[0].split(' ');
    if(match) {
        match.forEach( (item, index) => {
            if(index > 6) return;
            result += `${item} `;
        })
    } else {
        match = value && value.split(' ');        
        match.forEach( (item, index) => {
            if(index > 6) return;
            result += `${item} `;
        })
    }
    
    return result.trim();
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
        valueType = 'percentage';
        currencySymbol = currSymbol || null;
    } 

    if( valueCurrency && valueCurrency[0] &&  value === null) {
        value = parseFloat( valueCurrency[0] );
        valueType = 'currency';
        currencySymbol = currSymbol || valueCurrency[1] || valueCurrency[3] || null;
    }

    return {
        value: (value === 0 || (valueType === 'percentage' && value === 100) ) 
            ? null 
            : value,
        valueType,
        currencySymbol
    };

};

module.exports = { parserSeoUrl, parserRedirectUrl, parserShortTitle, parserOfferValue };
