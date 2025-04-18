import { ObjectId } from '../base';
import { CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

export const getBalance = async (req: Request, rep: Response) => {

    const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body;
    console.log("getBalance=> ", callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId)
    if (callerId && playerName && currency) {
        const user = await Users.findOne({ username: playerName });
        if (user.balance) {
            return { balance: user.balance }
        }
    }

}