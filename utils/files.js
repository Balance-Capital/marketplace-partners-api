
const normalizeName = (value) => {
    const re = new RegExp('!|\\+|\\(|\\)|\\.|,|\\s+|\\-|\\$','gi');
    const fileName = value && value.replace(re,'');
    return fileName.toLowerCase() || 'noname';
};

const getFileExt = (value) => {
    const re = /(?:\.([^.]+))?$/;
    const ext = re.exec(value);
    return ext && ext[1] || 'noext';
};

module.exports = { normalizeName, getFileExt };