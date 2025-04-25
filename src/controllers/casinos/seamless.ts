import { generatInfo, handleBet, ObjectId } from '../base';
import { CasinoBetHistory, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

export const getSeamless = async (req: Request, rep: Response) => {
    switch (req.body.method) {
        case 'getBalance': {
            const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
            console.log("getBalance=> ", req.body.id, callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId)
            if (callerId && playerName && currency) {
                const user = await Users.findOne({ username: playerName });
                console.log(user.balance * 100, "balance")
                if (user.balance) {
                    return rep.json({
                        "jsonrpc": "2.0",
                        "id": req.body.id,
                        "result": {
                            "balance": user.balance * 100,
                        }
                    })
                }
            }
            break;
        }
        case 'withdrawAndDeposit': {
            try {
                const { callerId, playerName, withdraw, deposit, currency, transactionRef, gameRoundRef, gameId, reason, sessionId, sessionAlternativeId, chargeFreerounds, bonusId, spinDetails } = req.body.params;
                console.log("withdrawAndDeposit =>", playerName, withdraw, transactionRef, deposit, currency, gameId)
                const amount = (deposit - withdraw) / 100;
                // if (currency === 'USD') {
                //     console.log("The currency is not supported.")
                //     return rep.json({
                //         jsonrpc: "2.0",
                //         id: 0,
                //         error: {
                //             "code": 2,
                //             "message": "The currency is not supported."
                //         }
                //     });
                // }
                if (deposit < 0) {
                    console.log("The depoist amount is not valid.")
                    return rep.json({
                        jsonrpc: "2.0",
                        id: 0,
                        error: {
                            "code": 3,
                            "message": "The depoist amount is not valid."
                        }
                    });
                }
                if (withdraw < 0) {
                    console.log("The withdraw amount is not valid.")
                    return rep.json({
                        jsonrpc: "2.0",
                        id: 0,
                        error: {
                            "code": 4,
                            "message": "The withdraw amount is not valid."
                        }
                    });
                }
                // Run user check and transaction check in parallel
                const [user, existingTransaction] = await Promise.all([
                    Users.findOne({ username: playerName }),
                    CasinoBetHistory.findOne({
                        transactionRef,
                        username: playerName
                    })
                ]);

                if (user.balance * 100 < withdraw) {
                    console.log("The player doesn't have enough money to do the bet action.")
                    return rep.json({
                        jsonrpc: "2.0",
                        id: 0,
                        error: {
                            "code": 1,
                            "message": "The player doesn't have enough money to do the bet action."
                        }
                    });
                }
                if (existingTransaction) {
                    return rep.json({
                        jsonrpc: "2.0",
                        id: req.body.id,
                        error: {
                            code: 409,
                            message: "Transaction already exists"
                        }
                    });
                }

                // Run balance update and bet history creation in parallel
                const [updatedBalance, betHistory] = await Promise.all([
                    handleBet({
                        req,
                        userId: user._id,
                        amount: (amount / 100),
                        currency,
                        type: 'c2gaming-casino-bet',
                        info: generatInfo(),
                        status: true
                    }),
                    CasinoBetHistory.create({
                        username: playerName,
                        userId: user._id,
                        amount: (amount / 100),
                        transactionRef,
                        currency,
                        gameId,
                        type: 'bet',
                        spinDetails,
                        provider: 'c2gaming'
                    })
                ]);
                console.log(updatedBalance.balance, "updatedBalance.balance")
                return rep.json({
                    jsonrpc: "2.0",
                    id: req.body.id,
                    result: {
                        newBalance: (Number(updatedBalance.balance) * 100),
                        transactionId: betHistory.transactionRef
                    }
                });
            } catch (error) {
                console.error("Error in withdrawAndDeposit:", error);
                return rep.json({
                    jsonrpc: "2.0",
                    id: 0,
                    error: {
                        code: 7,
                        message: "Internal server error"
                    }
                });
            }
        }
        case 'rollbackTransaction': {
            const { callerId, playerName, transactionRef, gameRoundRef, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
            console.log("rollbackTransaction =>", playerName, transactionRef,)
            const [user, existingTransaction] = await Promise.all([
                Users.findOne({ username: playerName }),
                CasinoBetHistory.findOne({
                    transactionRef,
                    username: playerName
                })
            ]);
            if (existingTransaction && existingTransaction.type !== 'rollback') {
                const [updatedBalance, betHistory] = await Promise.all([
                    handleBet({
                        req,
                        userId: user._id,
                        amount: -existingTransaction.amount,
                        currency: existingTransaction.currency,
                        type: 'c2gaming-casino-rollback',
                        info: generatInfo(),
                        status: true
                    }),
                    CasinoBetHistory.updateOne({ transactionRef }, { type: 'rollback' })
                ]);
                console.log(updatedBalance, "rollback")
                return rep.json({
                    jsonrpc: "2.0",
                    id: req.body.id,
                    result: {}
                });
            }
            break;
        }
        default:
            break;
    }
}