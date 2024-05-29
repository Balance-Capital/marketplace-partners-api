const SITEMAP_STORES = 'sitemap_stores';
const SITEMAP_BLOGS = 'sitemap_blogs';
const SITEMAP_STATIC = 'sitemap_static';
const SITEMAPS = [SITEMAP_STORES, SITEMAP_BLOGS, SITEMAP_STATIC]

module.exports = Object.freeze({
    GOOGLE_AUTH_SCOPE: 'https://www.googleapis.com/auth/webmasters',
    GOOGLE_AUTH_SCOPE_INDEXING: 'https://www.googleapis.com/auth/indexing',
    MAP_NAME: 'default',
    SITEMAPS,
    SITEMAP_STORES,
    SITEMAP_BLOGS,
    SITEMAP_STATIC,
    GOOGLE_INDEXING_TYPE_UPDATED : 'URL_UPDATED',
    GOOGLE_INDEXING_TYPE_DELETED : 'URL_DELETED'
});