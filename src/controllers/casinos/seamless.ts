import { ObjectId } from '../base';
import { CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

export const getSeamless = async (req: Request, rep: Response) => {
    console.log(req.method, req.body, "method", req.params)
    switch (req.body.method) {
        case 'getBalance': {
            const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
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
        }
        case 'withdrawAndDeposit': {
            const { callerId, playerName, withdraw, deposit, currency, transactionRef, gameRoundRef, reason, sessionId, sessionAlternativeId, chargeFreerounds, bonusId, spinDetails } = req.body.params;
            console.log("withdrawAndDeposit =>", playerName, withdraw, deposit,)
            const user = await Users.findOneAndUpdate(
                { username: playerName },
                { $inc: { balance: deposit - withdraw } },
                { new: true }
            );
            if (user.balance) {
                return rep.json({
                    "jsonrpc": "2.0",
                    "id": req.body.id,
                    "result": {
                        "newBalance": user.balance,
                        "transactionId": transactionRef,
                    }
                })
            }
            break;
        }
        case 'rollbackTransaction': {
            const { callerId, playerName, transactionRef, gameRoundRef, reason, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
            console.log("rollbackTransaction =>", playerName, transactionRef,)
            break;
        }
        default:
            break;
    }
}