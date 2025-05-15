import { CasinoBankGroup, CasinoBonus, CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';
import { addFavoriteGame } from '../base';

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('../../../config');

// Load the .pem file
const certPath = path.join(`${config.DIR}`, 'apikey.pem');
const cert = fs.readFileSync(certPath);

// Create HTTPS agent with .pem cert as both cert and key
const httpsAgent = new https.Agent({
    cert: cert,
    key: cert,
    rejectUnauthorized: false,
});

// Create Axios instance with the HTTPS agent
const client = axios.create({
    baseURL: `${process.env.CASINO_ENDPOINT}`,
    httpsAgent,
    timeout: 50000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
});

export const createBankGroup = async ({ currency }: { currency: string }) => {
    // const { currency } = req.body;
    try {
        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "BankGroup.Set",
            id,
            params: {
                Id: `GoldenBet_${currency}`,
                Currency: currency
            }
        });
        console.log('✅ Success:', res.data);
        if (res.data) {
            await CasinoBankGroup.create({ currency, id, group: `GoldenBet_${currency}` });
        }
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

export const setPlayer = async ({ Id, BankGroupId, Nick }: { Id: string, BankGroupId: string, Nick: string }) => {
    try {
        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Player.Set",
            id,
            params: {
                BankGroupId,
                Nick,
                Id
            }
        });
        console.log('✅ Success:', res.data);
        if (res.data?.result) {
            console.log(false)
            return true;
            // await Users.create({ username: Id, bankGroup: BankGroupId, nick: Nick });
        } else {
            return false
        }
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
        return false;
    }
}

export const setBonus = async ({ Id }: { Id: string }) => {
    try {
        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Bonus.Set",
            id,
            params: {
                Id
            }
        });
        console.log('✅ Success:', res.data);
        if (res.data) {
            await CasinoBonus.create({ name: Id, id });
        }
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

export const createSession = async (req: Request, rep: Response) => {
    const { PlayerId, GameId } = req.body;

    try {
        await addFavoriteGame({ PlayerId, GameId });

        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Session.Create",
            id,
            params: {
                PlayerId,
                GameId,
                Params: {
                    "language": "en",
                    // "freeround_bet": 2,
                    // "freeround_denomination": 0.3
                }
            }
        });
        console.log('✅ Success:', res.data);
        return rep.json(res.data)
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

export const closeSession = async (req: Request, rep: Response) => {
    const { SessionId } = req.body;
    try {
        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Session.Close",
            id,
            params: {
                SessionId
            }
        });
        console.log('✅ Success:', res.data);
        return rep.json(res.data)
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }

}

export const createDemo = async (req: Request, rep: Response) => {
    const { BankGroupId, GameId } = req.body;
    try {
        const id = new Date().getTime();
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Session.CreateDemo",
            id,
            params: {
                BankGroupId,
                GameId,
                "StartBalance": 10000,
                "Params": {
                    "language": "en"
                },
            }
        });
        console.log('✅ Success:', res.data);
        return rep.json(res.data);
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}
export const getGameListC2Gaming = async ({ id, BankGroupId }: { id: Number, BankGroupId: string }) => {
    // const { id, BankGroupId } = req.body;
    try {
        const res = await client.post('/', {
            jsonrpc: "2.0",
            method: "Game.List",
            id,
            params: { BankGroupId }
        });
        console.log('✅ Success usd:', res.data.result.Games[0], res.data.result.Games.length);
        if (res.data.result.Games && res.data.result.Games.length > 0) {
            for (const game of res.data.result.Games) {
                const existingGame = await CasinoGameLists.findOne({ Id: game.Id });
                if (!existingGame) {
                    await CasinoGameLists.create({ ...game, aggregator: 'c2gaming' });
                }
                const existingProvider = await CasinoProviders.findOne({ Id: game.SectionId });
                if (!existingProvider) {
                    await CasinoProviders.create({
                        Id: game.SectionId,
                        Name: game.SectionId,
                        aggregator: 'c2gaming'
                    });
                }
            }
        }
    } catch (err: any) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}
