import { Request, Response } from 'express';
import axios from 'axios';
import { CasinoGameLists, CasinoProviders } from '../../models/casinos';

const client = axios.create({
    baseURL: process.env.SKYXSPIN_ENDPOINT,
    timeout: 50000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Appsecret': `${process.env.SKYXSPIN_Appsecret}`,
        'Appid': `${process.env.SKYXSPIN_Appid}`
    }
});

export const createPlayer = async (userId: String) => {
    try {
        const res = await client.post(`/api/v1/player/create?UserID=${userId}`);
        if (res.data?.data) {
            return res.data.data.Pid;
        }
    } catch (error) {
        console.log(error)
    }
};

export const getGameListSkyxspin = async () => {
    try {
        const type = ['Slot game', 'Multiplayer game', 'Card game', 'Lottery game'];
        const res = await client.post(`/api/v1/game/list?Language=en`);
        console.log(res.data?.data?.List.length)
        if (res.data?.data?.List) {
            for (const game of res.data.data.List) {
                const existingGame = await CasinoGameLists.findOne({ Id: game.ID });
                if (!existingGame) {
                    try {
                        await CasinoGameLists.create({
                            Id: game.ID,
                            Name: game.Name,
                            Type: type[game.Type],
                            Icon: game.IconUrl,
                            aggregator: 'skyxspin',
                            SectionId: game.ID.split("_")[0]
                        });
                    } catch (err) {
                        console.log("Error creating game:", err);
                    }
                }
                const existingProvider = await CasinoProviders.findOne({ Id: game.ID.split("_")[0] });
                if (!existingProvider) {
                    await CasinoProviders.create({
                        Id: game.ID.split("_")[0],
                        Name: game.ID.split("_")[0]
                    });
                }
            }
        } else {
            console.log("data")
        }

    } catch (e) {
        console.log(e)
    }
}

export const launchGame = async (req: Request, rep: Response) => {
    const { PlayerId, GameId } = req.body;
    try {
        const res = await client.post(`/api/v1/game/launch?UserID=${PlayerId}&GameID=${GameId}&Language=en`);
        console.log(res.data, "res")
        console.log(res.data?.data?.Url, "url")
        if (res.data?.data) {
            return rep.json({ result: { SessionUrl: res.data.data.Url } })
        }
    } catch (e) {
        console.log(e)
    }
}

