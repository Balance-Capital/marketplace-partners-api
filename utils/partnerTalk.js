const moment = require('moment');

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

const logger = require('../services/logger');
const db = require('../models/index');

const partnerTalk = (talk, partnerName) => {
  try {
    db.models.Config.updateMany(
      {
        name: partnerName
      },
      {
        $push: {
          partnerTalk: { text: talk }
        }
      }
    )
      .exec()
      .catch((error) => logger.error(error))
      .then(() => {
        db.models.Config.updateMany(
          {
            name: partnerName
          },
          {
            $pull: {
              partnerTalk: {
                timestamps: {
                  $lte: moment()
                    .subtract(TALK_TIMEOUT_MINUTES, 'minutes')
                    .toDate()
                }
              }
            }
          }
        )
          .exec()
          .catch((error) => logger.error(error));
      });
  } catch (error) {
    logger.error(error);
  }
};

module.exports = {
  partnerTalk
};
