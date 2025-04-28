import { generatInfo, handleBet, NumberFix, ObjectId } from '../base';
import { CasinoBetHistory, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

//c2gaming
export const getSeamless = async (req: Request, rep: Response) => {
    switch (req.body.method) {
        case 'getBalance': {
            const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
            console.log("getBalance=> ", req.body.id, callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId)
            if (callerId && playerName && currency) {
                const user = await Users.findOne({ username: playerName });
                console.log(NumberFix(user.balance * 100, 5), "balance")
                if (user.balance) {
                    return rep.json({
                        "jsonrpc": "2.0",
                        "id": req.body.id,
                        "result": {
                            "balance": NumberFix(user.balance * 100, 5),
                        }
                    })
                }
            }
            break;
        }
        case 'withdrawAndDeposit': {
            try {
                const { callerId, playerName, withdraw, deposit, currency, transactionRef, gameRoundRef, gameId, reason, sessionId, sessionAlternativeId, chargeFreerounds, bonusId, spinDetails } = req.body.params;
                console.log("withdrawAndDeposit =>", withdraw, deposit, transactionRef, currency, gameId)
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
                        amount,
                        currency,
                        type: 'c2gaming-casino-bet',
                        info: transactionRef,
                        status: true
                    }),
                    CasinoBetHistory.create({
                        username: playerName,
                        userId: user._id,
                        amount,
                        transactionRef,
                        currency,
                        gameId,
                        type: 'bet',
                        spinDetails,
                        provider: 'c2gaming'
                    })
                ]);
                console.log(req.body.id, NumberFix(updatedBalance.balance * 100, 5), betHistory.transactionRef, "updatedBalance.balance")
                return rep.json({
                    jsonrpc: "2.0",
                    id: req.body.id,
                    "result": {
                        "newBalance": (NumberFix(updatedBalance.balance * 100, 5)),
                        "transactionId": betHistory.transactionRef
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
            try {
                const { callerId, playerName, transactionRef, gameRoundRef, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
                console.log("rollbackTransaction =>", playerName, transactionRef,)
                const [user, existingTransaction] = await Promise.all([
                    Users.findOne({ username: playerName }),
                    CasinoBetHistory.findOne({
                        transactionRef,
                        username: playerName
                    })
                ]);
                if (existingTransaction) {
                    const [updatedBalance, betHistory] = await Promise.all([
                        handleBet({
                            req,
                            userId: user._id,
                            amount: -existingTransaction.amount,
                            currency: existingTransaction.currency,
                            type: 'c2gaming-casino-rollback',
                            info: transactionRef,
                            status: true
                        }),
                        CasinoBetHistory.updateOne({ transactionRef }, { type: 'rollback' })
                    ]);
                    console.log(updatedBalance.balance, "rollback")
                    return rep.json({
                        "jsonrpc": "2.0",
                        "id": req.body.id,
                        "result": {}
                    });
                } else {
                    console.log("already done")
                    return rep.json({
                        jsonrpc: "2.0",
                        id: req.body.id,
                        error: {
                            code: 7,
                            message: "Transaction not found or already rolled back"
                        }
                    });
                }
            } catch (error) {
                console.error("Error in rollbackTransaction:", error);
                return rep.json({
                    jsonrpc: "2.0",
                    id: req.body.id,
                    error: {
                        code: 7,
                        message: "Internal server error"
                    }
                });
            }
        }
        default:
            break;
    }
}

//skyxspin
export const skyTransfer = async (req: Request, rep: Response) => {
    try {
        const { UserID, TransactionID, Amount, RoundID, GameID, ReqTime, Reason, IsEnd } = req.body;
        console.log(UserID, TransactionID, Amount, RoundID, GameID, ReqTime, Reason, IsEnd, "")
        const [user, existingTransaction] = await Promise.all([
            Users.findOne({ username: UserID }),
            CasinoBetHistory.findOne({
                transactionRef: TransactionID,
                username: UserID
            })
        ]);
        const [updatedBalance, betHistory] = await Promise.all([
            handleBet({
                req,
                userId: user._id,
                amount: Amount,
                currency: 'USD',
                type: `skyxspin-casino-${Reason}`,
                info: TransactionID,
                status: true
            }),
            CasinoBetHistory.create({
                username: UserID,
                userId: user._id,
                amount: Amount,
                transactionRef: TransactionID,
                currency: 'USD',
                gameId: GameID,
                type: Reason,
                provider: 'skyxspin'
            })
        ]);
        return rep.json(
            {
                "code": 0,
                "error": "",
                "data": {
                    "Balance": NumberFix(updatedBalance.balance, 5)
                }
            }
        )
    } catch (e) {
        console.log(e)
        return rep.json({
            "code": 1,
            "error": "some error occur!!"
        })
    }

}

export const skyBalance = async (req: Request, rep: Response) => {
    try {
        const { UserID } = req.body;
        const user = await Users.findById(UserID);
        if (user.balance) {
            return rep.json(
                {
                    "code": 0,
                    "error": "",
                    "data": {
                        "Balance": NumberFix(user.balance, 5)
                    }
                }
            )
        }
    } catch (e) {
        console.log(e)
        return rep.json({
            "code": 1,
            "error": "some error occur!!"
        })
    }
}



