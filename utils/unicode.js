const cleanString = input => input.map(char => char.charCodeAt(0) <= 127 ? char : '').join('');        

const isUnicodeDefault = input => !!((input && input.charCodeAt(0) <= 127));        

module.exports = {
    cleanString,
    isUnicodeDefault
}