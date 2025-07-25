import { handleBet, NumberFix } from '../base';
import { CasinoBetHistory, CasinoGameLists, Users } from '../../models';
import { Request, Response } from 'express';

//c2gaming
export const getSeamless = async (req: Request, rep: Response) => {
    try {
        switch (req.body.method) {
            case 'getBalance': {
                const { callerId, playerName, currency, gameId, bonusId, sessionId, sessionAlternativeId } = req.body.params;
                if (callerId && playerName && currency) {
                    const user = await Users.findOne({ username: playerName });
                    if (user.balance) {
                        return rep.status(200).json({
                            "jsonrpc": "2.0",
                            "id": req.body.id,
                            "result": {
                                "balance": Math.floor(user.balance * 100),
                            }
                        })
                    }
                }
                break;
            }
            case 'withdrawAndDeposit': {
                try {
                    const { callerId, playerName, withdraw, deposit, currency, transactionRef, gameRoundRef, gameId, reason, sessionId, sessionAlternativeId, chargeFreerounds, bonusId, spinDetails } = req.body.params;
                    const amount = (deposit - withdraw) / 100;
                    console.log(deposit, withdraw, "deposit, withdraw")
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
                    const [user, existingTransaction, game] = await Promise.all([
                        Users.findOne({ username: playerName }),
                        CasinoBetHistory.findOne({
                            transactionRef,
                            username: playerName
                        }),
                        CasinoGameLists.findOne({
                            Id: gameId
                        })
                    ]);
                    if (deposit === 0 && withdraw === 0) {
                        return rep.status(200).json({
                            jsonrpc: "2.0",
                            id: req.body.id,
                            "result": {
                                "newBalance": Math.floor(user.balance * 100),
                                "transactionId": transactionRef
                            }
                        });
                    }
                    if (user.balance * 100 < withdraw) {
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

                    const real = amount > 0
                        ? (user.creditBalance >= withdraw / 100 ? amount : (user.creditBalance / (withdraw / 100)) * amount)
                        : (user.creditBalance >= withdraw / 100 ? amount : -user.creditBalance);
                    const bonus = amount - real;

                    // Run balance update and bet history creation in parallel
                    const [updateuser, updatedBalance, betHistory] = await Promise.all([
                        Users.updateOne({ username: playerName }, { $set: { game: gameId } }),
                        handleBet({
                            req,
                            userId: user._id,
                            amount,
                            real,
                            bonus,
                            currency,
                            type: 'c2gaming-casino-bet',
                            info: transactionRef,
                            status: true
                        }),
                        CasinoBetHistory.create({
                            username: playerName,
                            parent: user.parent,
                            userId: user._id,
                            amount: -amount,
                            transactionRef,
                            currency,
                            gameId,
                            gameRoundRef,
                            win: deposit / 100,
                            bet: withdraw / 100,
                            realWin: user.creditBalance >= withdraw / 100 ? deposit / 100 : (user.creditBalance / (withdraw / 100)) * (deposit / 100),
                            realBet: user.creditBalance >= withdraw / 100 ? withdraw / 100 : user.creditBalance,
                            bonusWin: user.creditBalance >= withdraw / 100 ? 0 : (((withdraw / 100) - user.creditBalance) / (withdraw / 100)) * (deposit / 100),
                            bonusBet: user.creditBalance >= withdraw / 100 ? 0 : ((withdraw / 100) - user.creditBalance),
                            gameName: game.Name,
                            type: amount > 0 ? 'win' : 'lost',
                            spinDetails,
                            aggregator: 'c2gaming',
                            provider: game.SectionId
                        })
                    ]);
                    console.log(updatedBalance, "updatedBalance")
                    return rep.status(200).json({
                        jsonrpc: "2.0",
                        id: req.body.id,
                        "result": {
                            "newBalance": Math.floor(updatedBalance.balance * 100),
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
                                real: existingTransaction.realBet,
                                bonus: existingTransaction.bonusBet,
                                currency: existingTransaction.currency,
                                type: 'c2gaming-casino-rollback',
                                info: transactionRef,
                                status: true
                            }),
                            CasinoBetHistory.updateOne({ transactionRef }, { type: 'rollback' })
                        ]);
                        return rep.status(200).json({
                            "jsonrpc": "2.0",
                            "id": req.body.id,
                            "result": {}
                        });
                    } else {
                        return rep.status(200).json({
                            "jsonrpc": "2.0",
                            "id": req.body.id,
                            "result": {}
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
    } catch (e) {
        console.log(e, "c2gaming")
    }
}

//skyxspin
export const skyTransfer = async (req: Request, rep: Response) => {
    try {
        const { UserID, TransactionID, Amount, RoundID, GameID, ReqTime, Reason, IsEnd } = req.body;

        const user = await Users.findOne({ username: UserID });

        if (user.balance < 0) {
            console.log("Balance is less than 0")
            return rep.json({
                "code": 1,
                "error": "some error occur!!"
            });
        }

        const newBalance = Math.round((user.balance + NumberFix(Amount, 5)) * 100000) / 100000;
        if (newBalance < 0) {
            return rep.json({
                "code": 1,
                "error": "some error occur!!"
            });
        }

        if (Amount === 0) {
            return rep.json({
                "code": 0,
                "error": "",
                "data": {
                    "Balance": NumberFix(user.balance, 5)
                }
            });
        }

        const [existingTransaction, game] = await Promise.all([
            CasinoBetHistory.findOne({
                gameRoundRef: RoundID
            }),
            CasinoGameLists.findOne({
                Id: GameID
            })
        ]);

        if (Reason === 'bet') {
            const real = user.creditBalance >= Math.abs(Amount) ? Math.abs(Amount) : user.creditBalance;
            const bonus = user.creditBalance < Math.abs(Amount) ? Math.abs(Amount) - user.creditBalance : 0;

            const [updateuser, updatedBalance, betHistory] = await Promise.all([
                Users.updateOne({ username: UserID }, { $set: { game: GameID } }),
                handleBet({
                    req,
                    userId: user._id,
                    amount: Amount,
                    real: -real,
                    bonus: -bonus,
                    currency: 'USD',
                    type: `skyxspin-casino-${Reason}`,
                    info: TransactionID,
                    status: true
                }),
                CasinoBetHistory.findOneAndUpdate({
                    gameRoundRef: RoundID
                }, {
                    $inc: { amount: Amount },
                    $set: {
                        username: UserID,
                        userId: user._id,
                        transactionRef: TransactionID,
                        gameRoundRef: RoundID,
                        currency: 'USD',
                        parent: user.parent,
                        bet: Math.abs(Amount),
                        realBet: real,
                        bonusBet: bonus,
                        gameId: GameID,
                        gameName: game.Name,
                        type: Reason,
                        aggregator: 'skyxspin',
                        provider: game.SectionId
                    }
                }, {
                    upsert: true,
                    new: true
                })
            ]);

            return rep.json({
                "code": 0,
                "error": "",
                "data": {
                    "Balance": NumberFix(updatedBalance.balance, 5)
                }
            });
        } else {
            const real = (Amount * existingTransaction.realBet) / (existingTransaction.realBet + existingTransaction.bonusBet);
            const bonus = (Amount * existingTransaction.bonusBet) / (existingTransaction.realBet + existingTransaction.bonusBet);

            const [updateuser, updatedBalance, betHistory] = await Promise.all([
                Users.updateOne({ username: UserID }, { $set: { game: GameID } }),
                handleBet({
                    req,
                    userId: user._id,
                    amount: Amount,
                    real: real,
                    bonus: bonus,
                    currency: 'USD',
                    type: `skyxspin-casino-${Reason}`,
                    info: TransactionID,
                    status: true
                }),
                CasinoBetHistory.findOneAndUpdate({
                    gameRoundRef: RoundID
                }, {
                    $inc: { amount: Amount },
                    $set: {
                        username: UserID,
                        userId: user._id,
                        transactionRef: TransactionID,
                        gameRoundRef: RoundID,
                        currency: 'USD',
                        parent: user.parent,
                        win: Amount,
                        realWin: real,
                        bonusWin: bonus,
                        gameId: GameID,
                        gameName: game.Name,
                        type: Reason,
                        aggregator: 'skyxspin',
                        provider: game.SectionId
                    }
                }, {
                    upsert: true,
                    new: true
                })
            ]);

            return rep.json({
                "code": 0,
                "error": "",
                "data": {
                    "Balance": NumberFix(updatedBalance.balance, 5)
                }
            });
        }

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
        const user = await Users.findOne({ username: UserID });
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

export const playxspin = async (req: Request, rep: Response) => {
    try {
        const { command, data, timestamp, check } = req.body;
        switch (command) {
            case "authenticate": {
                const user = await Users.findOne({ username: data.account });
                if (user) {
                    return rep.json({
                        "result": 0,
                        "status": "OK",
                        "data": {
                            "account": user.username,
                            "balance": NumberFix(user.balance, 5),
                        }
                    })
                } else {
                    return rep.json({
                        "result": 1,
                        "status": "ERROR",
                    })
                }
            }
            case "balance": {
                const user = await Users.findOne({ username: data.account });
                if (user) {
                    return rep.json({
                        "result": 0,
                        "status": "OK",
                        "data": {
                            "balance": NumberFix(user.balance, 5),
                        }
                    })
                } else {
                    return rep.json({
                        "result": 1,
                        "status": "ERROR",
                    })
                }
            }
            case "bet": {
                const user = await Users.findOne({ username: data.account });

                if (user.balance < 0) {
                    return rep.json({
                        "code": 1,
                        "error": "some error occur!!"
                    });
                }

                const newBalance = Math.round((user.balance + data.amount) * 100000) / 100000;
                if (newBalance < 0) {
                    return rep.json({
                        "code": 1,
                        "error": "some error occur!!"
                    });
                }

                const game = await CasinoGameLists.findOne({
                    Id: data.game_code
                });

                const [updateuser, updatedBalance, betHistory] = await Promise.all([
                    Users.updateOne({ username: data.account }, { $set: { game: data.game_code } }),
                    handleBet({
                        req,
                        userId: user._id,
                        amount: -data.amount,
                        real: user.creditBalance >= data.amount ? -data.amount : -user.creditBalance,
                        bonus: user.creditBalance < data.amount ? -(data.amount - user.creditBalance) : 0,
                        currency: 'USD',
                        type: `playxspin-casino-bet`,
                        info: data.trans_id,
                        status: true
                    }),
                    CasinoBetHistory.findOneAndUpdate({
                        gameRoundRef: data.round_id,
                        aggregator: 'playxspin',
                    }, {
                        $inc: { amount: -data.amount },
                        $set: {
                            username: data.account,
                            userId: user._id,
                            transactionRef: data.trans_id,
                            gameRoundRef: data.round_id,
                            currency: 'USD',
                            parent: user.parent,
                            bet: data.amount,
                            realBet: user.creditBalance >= data.amount ? data.amount : user.creditBalance,
                            bonusBet: user.creditBalance < data.amount ? data.amount - user.creditBalance : 0,
                            gameId: data.game_code,
                            gameName: game.Name,
                            type: 'bet',
                            provider: game.SectionId
                        }
                    }, {
                        upsert: true,
                        new: true
                    })
                ]);
                return rep.json({
                    "result": 0,
                    "status": "OK",
                    "data": {
                        "balance": updatedBalance.balance
                    }
                });
            }
            case "win": {
                const user = await Users.findOne({ username: data.account });

                if (user.balance < 0) {
                    return rep.json({
                        "code": 1,
                        "error": "some error occur!!"
                    });
                }

                const newBalance = Math.round((user.balance + data.amount) * 100000) / 100000;
                if (newBalance < 0) {
                    return rep.json({
                        "code": 1,
                        "error": "some error occur!!"
                    });
                }

                const game = await CasinoGameLists.findOne({
                    Id: data.game_code
                });

                const existingTransaction = await CasinoBetHistory.findOne({
                    gameRoundRef: data.round_id
                });

                const [updateuser, updatedBalance, betHistory] = await Promise.all([
                    Users.updateOne({ username: data.account }, { $set: { game: data.game_code } }),
                    handleBet({
                        req,
                        userId: user._id,
                        amount: data.amount,
                        currency: 'USD',
                        real: (existingTransaction.realBet * data.amount) / (existingTransaction.realBet + existingTransaction.bonusBet),
                        bonus: (existingTransaction.bonusBet * data.amount) / (existingTransaction.realBet + existingTransaction.bonusBet),
                        type: `playxspin-casino-win`,
                        info: data.trans_id,
                        status: true
                    }),
                    CasinoBetHistory.findOneAndUpdate({
                        gameRoundRef: data.round_id
                    }, {
                        $inc: { amount: data.amount },
                        $set: {
                            username: data.account,
                            userId: user._id,
                            transactionRef: data.trans_id,
                            gameRoundRef: data.round_id,
                            currency: 'USD',
                            parent: user.parent,
                            win: data.amount,
                            realWin: (existingTransaction.realBet * data.amount) / (existingTransaction.realBet + existingTransaction.bonusBet),
                            bonusWin: (existingTransaction.bonusBet * data.amount) / (existingTransaction.realBet + existingTransaction.bonusBet),
                            gameId: data.game_code,
                            gameName: game.Name,
                            type: existingTransaction.amount + data.amount > 0 ? 'win' : 'lost',
                            aggregator: 'playxspin',
                            provider: game.SectionId
                        }
                    }, {
                        upsert: true,
                        new: true
                    })
                ]);
                return rep.json({
                    "result": 0,
                    "status": "OK",
                    "data": {
                        "balance": updatedBalance.balance
                    }
                });
            }
            case "cancel": {
                const [user, existingTransaction, game] = await Promise.all([
                    Users.findOne({ username: data.account }),
                    CasinoBetHistory.findOne({
                        transactionRef: data.trans_id,
                        username: data.account
                    }),
                    CasinoGameLists.findOne({
                        Id: data.game_code
                    })
                ]);
                const [updateuser, updatedBalance, betHistory] = await Promise.all([
                    Users.updateOne({ username: data.account }, { $set: { game: data.game_code } }),
                    handleBet({
                        req,
                        userId: user._id,
                        amount: -existingTransaction.amount,
                        real: -existingTransaction.realBet,
                        bonus: -existingTransaction.bonusBet,
                        currency: 'USD',
                        type: `playxspin-casino-cancel`,
                        info: data.trans_id,
                        status: true
                    }),
                    CasinoBetHistory.findOneAndUpdate({
                        gameRoundRef: data.round_id
                    }, {
                        $inc: { amount: -existingTransaction.amount },
                        $set: {
                            username: data.account,
                            userId: user._id,
                            transactionRef: data.trans_id,
                            gameRoundRef: data.round_id,
                            currency: 'USD',
                            parent: user.parent,
                            gameId: data.game_code,
                            gameName: game.Name,
                            type: 'cancel',
                            aggregator: 'playxspin',
                            provider: game.SectionId
                        }
                    }, {
                        upsert: true,
                        new: true
                    })
                ]);
                return rep.json({
                    "result": 0,
                    "status": "OK",
                    "data": {
                        "balance": updatedBalance.balance
                    }
                });
            }
            case "status": {
                return rep.json({
                    "result": 0,
                    "status": "OK",
                    "data": {
                        "account": data.account,
                        "trans_id": data.trans_id,
                        "trans_status": "OK",
                    }
                });
            }
        }
    } catch (e) {
        console.log(e, "playxspin")
    }
}

