/* eslint-disable global-require */
const { I18n } = require('i18n');

const i18n = new I18n({
  locales: ['en'],
  staticCatalog: {
    en: require('../locales/en.json')
  },
  defaultLocale: 'en',
  queryParameter: 'lang'
})

module.exports = i18n;