require('dotenv').config();
const os = require("os");
const cluster = require("cluster");
const express = require('express');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');

const PORT = process.env.APP_PORT || 3030;
const RATIO = 1;
const CLASTER_MIN_SIZE = 100;
const CURRENT_CLUSTER_SIZE = os.cpus().length * RATIO;

const logger = require('./services/logger');

const commissionReportAffiliateNetworks = require('./routes/CommissionReportAffiliateNetworks');
const PingPong = require('./routes/PingPongRoute');

const app = express();
app.use(helmet());

app.disable('x-powered-by');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({limit: '50mb'}));
app.use(
  mongoSanitize({
    allowDots: false,
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warning(`This request[${key}] is sanitized`, req);
    }
  })
);
app.use('/commission-report', commissionReportAffiliateNetworks);

app.use('/ping', PingPong);

if (CURRENT_CLUSTER_SIZE > CLASTER_MIN_SIZE) {
  if (cluster.isMaster) {

    for (let i=0; i < CURRENT_CLUSTER_SIZE; i+=1) {
      cluster.fork();
    };

    cluster.on('exit', (worker) => {
      logger.info(`Worker, ${worker.id}, has exitted.`);
    });

    
  } else {

    app.listen(PORT, () => logger.info(`API server listening on port ${PORT} and worker ${process.pid}`));

  };
} else {

  app.listen(PORT, () => logger.info(`API server listening on port ${PORT} with the single worker ${process.pid}`));
    
};

module.exports = app;