import { Request, Response } from 'express';
import axios from 'axios';
import { CasinoGameLists } from '../../models/casinos';

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
        const response = await client.post(`/api/v1/player/create?UserID=${userId}`);
        if (response.data) {
            return response.data.Pid;
        }
    } catch (error) {
        console.log(error)
    }
};

export const getGameLists = async () => {
    try {
        const type = ['Slot game', 'Multiplayer game', 'Card game', 'Lottery game'];
        const response = await client.post(`/api/v1/game/list?Language=en`);
        if (response?.data?.List) {
            for (const game of response.data.List) {
                await CasinoGameLists.create({
                    gameId: game.GameID,
                    name: game.GameName,
                    type: game.GameType,
                    provider: 'SkyXSpin'
                });
            }
        }
    } catch (e) {
        console.log(e)
    }
}