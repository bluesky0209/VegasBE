import { Request, Response } from 'express';
import axios from 'axios';
import { CasinoGameLists } from '../../models/casinos/gamelists';
import { CasinoProviders, Users } from '../../models';

const client = axios.create({
    baseURL: process.env.PLAYXSPIN_ENDPOINT,
    timeout: 50000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.PLAYXSPIN_Token}`
    }
});

const providers = [
    { provider_id: 1, provider_name: "pp" },
    { provider_id: 3, provider_name: "pg" },
    { provider_id: 4, provider_name: "booongo" },
    { provider_id: 5, provider_name: "playson" },
    { provider_id: 7, provider_name: "habanero" },
    { provider_id: 9, provider_name: "jili" },
    { provider_id: 13, provider_name: "playstar" },
    { provider_id: 14, provider_name: "xgaming" }
];

export const getAgentInfo = async () => {
    const res = await client.get('/v4/agent/info');
    console.log(res.data);
}

export const createPlayer = async (data: any) => {
    const res = await client.post('v4/user/create', data);
    return res.data;
}

export const getGameListPlayxspin = async () => {

    try {
        await Promise.all(providers.map(async (provider) => {
            const existingProvider = await CasinoProviders.findOne({ Id: provider.provider_name });
            if (!existingProvider) {
                await CasinoProviders.create({
                    Id: provider.provider_name,
                    Name: provider.provider_name,
                    aggregator: 'playxspin'
                });
            }

            const res = await client.post(`/v4/game/games`, {
                provider_id: provider.provider_id,
                lang: 1
            });

            console.log(`${res.data.data.length} games found for provider ${provider.provider_name}`);

            for (const game of res.data.data) {
                const existingGame = await CasinoGameLists.findOne({ Id: game.game_code, aggregator: 'playxspin' });
                if (!existingGame) {
                    await CasinoGameLists.create({
                        Id: game.game_code,
                        Name: game.game_name,
                        aggregator: 'playxspin',
                        Type: game.category,
                        SectionId: provider.provider_name,
                        Icon: game.game_image
                    });
                }
            }
        }));
    } catch (error) {
        console.error('Error fetching game list:', error);
    }
}

export const launchGame = async (req: Request, rep: Response) => {
    const { PlayerId, GameId } = req.body;
    let [game, user] = await Promise.all([
        CasinoGameLists.findOne({ Id: GameId, aggregator: 'playxspin' }),
        Users.findOne({ username: PlayerId })
    ]);
    if (!user.code) {
        let updateuser = await createPlayer({
            name: user.username,
        });
        user = await Users.findOneAndUpdate({ username: PlayerId }, { $set: { code: updateuser.data.user_code } });
    }

    console.log(user.code, "user");
    const provider_id = providers.find(p => p.provider_name === game.SectionId)?.provider_id;

    try {
        let result = await client.post(`/v4/game/game-url`, {
            "user_code": user.code,
            "provider_id": provider_id,
            "game_symbol": GameId,
            "lang": 1,
            "return_url": "https://bcasino24.com",
            "win_ratio": 0
        });
        console.log(result.data.data.game_url, "playxspin");
        return rep.json({ result: { SessionUrl: result.data.data.game_url } })
    } catch (error: any) {
        console.log(error)
    }
}


