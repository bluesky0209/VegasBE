import 'dotenv/config';
import 'regenerator-runtime';
import * as path from 'path';
import * as morgan from 'morgan';
import * as cors from 'cors';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as session from 'express-session';
import * as useragent from 'express-useragent';
import * as methodOverride from 'method-override';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
// import { createStream } from 'rotating-file-stream';
import socket from './socket';
import routes1 from './router1';
import routes2 from './routes2';
import routes3 from './routes3';
import { RetrunValidation } from './middlewares/validation';
import { checkUrl, corsOptionsDelegate } from './middlewares/auth';
import { clientErrorHandler, logErrors, sendEmail } from './controllers/base';
import { createBankGroup, createDemo, createSession, setPlayer } from './controllers/casinos/api';
import { getGameListSkyxspin } from './controllers/casinos/skyxspin';
const config = require('../config');

const app = express();

// const accessLogStream = createStream('access.log', {
//     interval: '1d',
//     path: path.join(`${config.DIR}`, 'log')
// });
app.use(compression());
app.use(useragent.express());
// app.use(morgan('combined', { stream: accessLogStream }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
app.use(bodyParser.text({ type: 'text/html' }));
app.use(methodOverride());
app.use(logErrors);
app.use(clientErrorHandler);
app.use(express.static(`${config.DIR}/upload`));

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'no-referrer' }
    })
);
app.set('trust proxy', 1);
app.use(
    session({
        secret: process.env.SESSION_SECRET as string,
        saveUninitialized: true,
        resave: true,
        cookie: {
            httpOnly: true,
            secure: true,
            domain: process.env.DOMAIN,
            path: '*',
            expires: new Date(Date.now() + 60 * 60 * 1000)
        }
    })
);

app.use(express.static(`${config.DIR}/${process.env.FRONTEND}`));

if (process.env.MODE === 'dev') {
    app.use(cors('*' as cors.CorsOptions));
} else {
    app.use(cors(corsOptionsDelegate));
    app.use(checkUrl);
}

const apiV1Limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false
});

const apiV2Limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100000,
    standardHeaders: true,
    legacyHeaders: false
});

const apiV3Limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/v1/', apiV1Limiter, routes1); //user action
app.use('/api/v2/', apiV2Limiter, routes2); //user action
app.use('/api/v3/', apiV3Limiter, routes3);
app.get('*', apiV2Limiter, (req: express.Request, res: express.Response) =>
    res.sendFile(`${config.DIR}/${process.env.FRONTEND}/index.html`)
);

app.use(RetrunValidation);
// createBankGroup({ currency: 'USD' });
// getGameList({ id: 1744970985003, BankGroupId: 'GoldenBet_USD' });
// setPlayer({ Id: 'test123', BankGroupId: 'GoldenBet_USD', Nick: 'test123' })
// createSession({ PlayerId: 'testplayer', GameId: 'slots3elcartelplus_mga' })
// createDemo({ BankGroupId: 'GoldenBet_USD', GameId: 'cdt_wzdn' })
// getGameLists();
// sendEmail({ to: "wstar0209@gmail.com", subject: "test", html: "test" })
mongoose
    .connect(process.env.DATABASE as string)
    .then(() => {
        const db = mongoose.connection.db;

        const port = process.env.PORT || 5000;
        console.log(port, process.env.PORT, "port")
        if (process.env.TYPE === 'https') {
            console.log("here")
            const options = {
                key: fs.readFileSync(`${config.DIR}/server-key.pem`),
                cert: fs.readFileSync(`${config.DIR}/server-crt.pem`),
                ca: fs.readFileSync(`${config.DIR}/seamless-ca.pem`)
            };
            const https = require('https').createServer(options, app);
            const io = require('socket.io')(https, { cors: { origin: '*' } });
            socket(io);
            app.set('io', io);
            https.listen(port, 'localhost');
            console.log('server listening on:', port);
        } else {
            const http = require('http').createServer(app);
            const io = require('socket.io')(http, { cors: { origin: '*' } });
            socket(io);
            app.set('io', io);
            http.listen(port, '0.0.0.0');
            console.log('server listening on:', port);
        }
    })
    .catch((error: any) => {
        console.log('database connection error => ', error);
    });
