const generateRandomNumber = (min=0, max=10000) => Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = {
    generateRandomNumber
}