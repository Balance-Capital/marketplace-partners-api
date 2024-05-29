const { AIClient } = require('p4u-client-ai');

const {
    MAX_WORDS_IN_TITLE
} = Object.freeze({
    MAX_WORDS_IN_TITLE: 7
});

const {
    CACHE_TITLE_GENERATOR
} = require('../constants/cacheKeyNames');

const {
    CACHE_DEFAULT_EXPIRE
} = require('../constants/cacheDefaultExpire');

const MAX_LOOPS = 5;

const logger = require('../services/logger');
const db = require('../models/index');
const dbApi = require('../models/apiDatabase');

require('../services/cacheRedis');

/**
 * 
 * @param {*} value 
 * @param {*} symbol 
 * @param {*} title 
 * @param {*} version 
 * @returns {*} {version: string value: string}
 */
const makeTitle = async (value, symbol, title, version=0) => {
    const cacheExpire = await db.models.RedisCacheKeys.findOne({name:CACHE_TITLE_GENERATOR},{expire:1})
        .cache({key:CACHE_TITLE_GENERATOR,expire:CACHE_DEFAULT_EXPIRE})
        .exec()
        .catch(error=>logger.error(error))
        .then(result => result.expire)
        ;
  
    if(!value && !title) return null;
    if(!value && title) 
        return title.split(' ')
                .filter( (item, index) => (index < MAX_WORDS_IN_TITLE) ? item : '' )
                .join(' ')
                ;
    const sort = {_id:1};
    const titleGenerator = await db.models.TitleGenerator.find()
        .sort(sort)
        .cache({key: CACHE_TITLE_GENERATOR, expire: cacheExpire})
        .exec();

    const shortTitle = {
        version,
        value
    }; 

    const rndInt = Math.floor(Math.random() * titleGenerator.length);
    const synonym = titleGenerator[version] && titleGenerator[version].text || titleGenerator[rndInt].text;

    const first = title && title.match(/(get|save|extra|sale|from|now|only|spend|orders)/gi);
    const firsTtext = `${first && first[0].trim() || 'Get'}`;

    const last = title && title.match(/(off|over|discount|free(.*)?shipping)/gi);
    const lasTtext = `${last && last[0].trim().split(' ').filter( (item, index) => (index < MAX_WORDS_IN_TITLE / 2) ? item : '' ).join(' ') || 'get more, occasion'}`;

    if(symbol === '%') {
        shortTitle.value = `${firsTtext} ${value}${symbol} ${lasTtext} ${synonym}`;
    } else {
        shortTitle.value = `${firsTtext} ${symbol || ''}${value} ${lasTtext} ${synonym}`;
    };

    return shortTitle;
}

/**
 * Generates a title using an AI model.
 *
 * @param {string} title - The input title.
 * @param {string} [description=' '] - The description context.
 * @returns {Promise<string|null>} The generated title or null if no title is generated.
 * @throws {Error} If apiKey or taskId is not provided.
 */
const makeTitleAI = async (title, description = ' ') => {
  const apiKey = process.env.P4U_CLIENT_AI_KEY || null;
  const taskId = process.env.P4U_TITLE_TASK_ID || null;

  if (!apiKey || !taskId) {
    throw new Error('apiKey or taskId is not provided');
  }

  try {
    const client = new AIClient(apiKey);
    const request = {
      idTask: taskId,
      context: description,
      ask: title
    };

    for (let loops = 1; loops <= MAX_LOOPS; loops++) {
      const { data: { text = '' } = {} } = await client.runTask(request);
      if (text) {
        return text;
      }
    }

    return null;
  } catch (err) {
    logger.warning(`[makeTitle] makeTitleAI ${err?.message}`, err);
    return null;
  }
};

const findTitle = async (value, symbol, title, store) => {
    const cacheExpire = await db.models.RedisCacheKeys.findOne({name:CACHE_TITLE_GENERATOR},{expire:1})
        .cache({key:CACHE_TITLE_GENERATOR,expire:CACHE_DEFAULT_EXPIRE})
        .exec()
        .catch(error=>logger.error(error))
        .then(result=>result.expire)
        ;

    const maxVersion = await db.models.TitleGenerator.find()
        .cache({key: CACHE_TITLE_GENERATOR, expire: cacheExpire})
        .exec()
        .then(results=>results && results.length-1) 
        ;

    let exists = false;
    let version = -1;
    let shortTitle;

    do {
        version+=1;
        // eslint-disable-next-line no-await-in-loop
        shortTitle = await makeTitle(value, symbol, title, version);
        if(!shortTitle || !shortTitle.value) {
            exists = false;
            break;
        }

        if(!store) {
            exists = false;
            break;
        }
        // eslint-disable-next-line no-await-in-loop
        exists = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({_id:store.id,'offers.shortTitle':shortTitle.value})
            .exec()
            .then(results=>results.length) > 0;
        if(version > maxVersion) exists = false;
    } while(exists);

    const returnValue = shortTitle && shortTitle.value 
        || title && title.split(' ').filter( (item, index) => (index < MAX_WORDS_IN_TITLE) ? item : '' ).join(' ');

    return returnValue;
}

module.exports = { makeTitle, findTitle, makeTitleAI };