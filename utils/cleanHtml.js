const cleanHtml = (input) => input && input.replace(/<\/?[^>]+(>|$)/g,' ').replace(/\s+/g, ' ') || null;

module.exports = {
    cleanHtml
}