import { ObjectId } from '../base';
import { CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

export const getSeamless = async (req: Request, rep: Response) => {
    console.log(req.method, "method")
    switch (req.body.method) {
        case 'getBalance':
            const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body;
            console.log("getBalance=> ", callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId)
            if (callerId && playerName && currency) {
                const user = await Users.findOne({ username: playerName });
                if (user.balance) {
                    return rep.json({
                        "jsonrpc": "2.0",
                        "id": req.body.id,
                        "result": {
                            "balance": user.balance,
                            "freeroundsLeft": 5
                        }
                    })
                }
            }
            break;

        default:
            break;
    }

}