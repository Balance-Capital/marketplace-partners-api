
const get = async (req, res) => {
    res.status(200).send('pong');
};

module.exports = { get };