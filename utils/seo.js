/* eslint-disable no-underscore-dangle */
const fs = require('fs');
require('dotenv').config();

const logger = require('../services/logger');

const minChars = process.env.SEO_CONTENT_MIN_CHARS && parseInt(process.env.SEO_CONTENT_MIN_CHARS,10) || 500;

const CSV = {
    path: 'reports',
    work: process.env.SEO_INDEXING_REPORT === 'true' || false
}

const dbApi = require('../models/apiDatabase');

const countingChars = (text) => text.replace(/\s+/g,'').length;

const stripHtml = (text) => text && text.replace(/<.[^<>]*>/igu,'') || '';

const updateDb = async (storeId, countChars) => {
    dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateOne({
        _id: storeId
    },[{
        $set: {
            'seo.longTail': null,
            'seo.contentLength': countChars
        }
    }]).exec().catch(err=>logger.error(err));
}

const createCSV = (fileName, records) => {
    let csv = '"Name","Domain","Chars"\r\n';
    records.forEach((item)=>{
        const countChars =  `${item.description || ''} ${stripHtml(item.aboutOffers) || ''} ${item.faq && item.faq.map((faqItem)=>`${faqItem.question}, ${faqItem.answer}`).join(',') || ''}`;
        csv += `"${item.name}","${item.domain}","${countingChars(countChars)}"\r\n`; 
    });
    fs.writeFileSync(`${CSV.path}/${fileName}.csv`,csv);
}

const doIndexingStores = async () => {
    await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema)
    .find({},{description:1, aboutOffers:1, faq:1, domain:1, name:1, _id:1})
    .exec()
    .then((stores) => {

        const noIndexStore = stores.reduce((a,b) => {
            const text = `${b.description || ''} ${stripHtml(b.aboutOffers) || ''} ${b.faq && b.faq.map((item)=>`${item.question}, ${item.answer}`).join(',') || ''}`;
            if(countingChars(text) < minChars)
                a.push(b);
            return a;
        },[]);

        const indexStore = stores.reduce((a,b) => {
            const text = `${b.description || ''} ${stripHtml(b.aboutOffers) || ''} ${b.faq && b.faq.map((item)=>`${item.question}, ${item.answer}`).join(',') || ''}`;
            if(countingChars(text) > minChars)
                a.push(b);
            return a;
        },[]);

        noIndexStore.forEach((item)=>{
            const countChars =  `${item.description || ''} ${stripHtml(item.aboutOffers) || ''} ${item.faq && item.faq.map((faqItem)=>`${faqItem.question}, ${faqItem.answer}`).join(',') || ''}`;
            updateDb(item._id, countingChars(countChars));
        });
        if(CSV.work) createCSV('noIndex',noIndexStore);

        indexStore.forEach((item)=>{
            const countChars =  `${item.description || ''} ${stripHtml(item.aboutOffers) || ''} ${item.faq && item.faq.map((faqItem)=>`${faqItem.question}, ${faqItem.answer}`).join(',') || ''}`;
            updateDb(item._id, countingChars(countChars));
        });
        if(CSV.work) createCSV('index',indexStore);

        const statistics = {
            index:indexStore.length,
            noindex:noIndexStore.length
        };
        logger.info(JSON.stringify(statistics));
    });
};

const cronIndexingStore = () => new Promise((resolve, reject)=>{
    const resolveText = 'seo: cron indexed stores';
    try {
        doIndexingStores().then(()=>{
            resolve(resolveText);
        });
    } catch (err) {
        reject(err);
    }
})

const testFunction = () => {
    cronIndexingStore().then(result=>logger.info(result));
}

if(process.argv[2] === 'test') {
    testFunction();
};

module.exports = {
    doIndexingStores,
    cronIndexingStore,
    testFunction
};