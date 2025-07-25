import { Request, Response } from 'express';
import { Bonus, CashierHistory, Users } from '../../models';
import { balanceUpdate, ObjectId } from '../base';
import { BONUSCONFIG, BONUSTYPE } from '../../config';

export const deposit = async (req: Request, res: Response) => {
    try {
        let { userId, amount, payuserId, bonusType = 'general' } = req.body;

        const [user, payuser] = await Promise.all([
            Users.findById(userId),
            Users.findById(payuserId)
        ]);

        if (payuser.role !== 'admin' && payuser.balance < amount) {
            return res.status(400).json('Insufficient balance');
        }

        if (!user || !payuser) {
            return res.status(404).json('User not found');
        }

        const hasPermission = payuser.role === 'admin' || user.parent[payuser.role] === payuser.username;
        if (!hasPermission) {
            return res.status(403).json('You are not allowed to deposit to this user');
        }

        if (bonusType === 'wager' && user.balance >= 1) {
            return res.status(400).json(`Error: Player has credits, first play all credits Player: ${user.username}`);
        }

        if (user.bonusType === 'wager') {
            return res.status(400).json('Deposit is not allowed to this user because of wager bonus');
        }

        if (BONUSTYPE.includes(bonusType)) {
            if (user.role !== 'player') {
                return res.status(400).json('Bonus is not allowed to this user');
            }
        }
        let typeDetail = "deposit"
        let bonus = 0;
        if (bonusType && bonusType !== 'general') {

            const config = BONUSCONFIG[bonusType];
            if (config) {
                if (bonusType === 'wager') {
                    const lastWagerBonus = await Bonus.findOne({
                        userId: ObjectId(userId),
                        type: 'wager'
                    }).sort({ createdAt: -1 });

                    if (lastWagerBonus) {
                        const hoursSinceLastBonus = (Date.now() - lastWagerBonus.createdAt.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceLastBonus < 1) {
                            const minutesLeft = Math.ceil((1 - hoursSinceLastBonus) * 60);
                            const hours = Math.floor(minutesLeft / 60);
                            const minutes = String(minutesLeft % 60).padStart(2, '0');
                            return res.status(400).json(
                                `You cannot use BONUS yet. Try again in ${hours}:${minutes}:00. Player: ${user.username}`
                            );
                        }
                    }

                    const bonusData = {
                        userId: ObjectId(userId),
                        amount,
                        payuserId: ObjectId(payuserId),
                        type: bonusType,
                        status: config.status
                    };
                    await Users.findOneAndUpdate({ _id: ObjectId(userId) }, {
                        wagerBonus: amount, $inc: { bonusBalance: amount }
                    })
                    await Promise.all([
                        Bonus.create(bonusData),
                        balanceUpdate({
                            req,
                            userId,
                            amount,
                            type: 'In',
                            payuserId,
                            typeDetail: 'Wager Bonus',
                            bonusType,
                            bonus: 0
                        })
                    ]);

                    if (payuser.role === 'cashier') {
                        await CashierHistory.create({
                            userId: ObjectId(payuserId),
                            content: `2xBONUS IN: ${amount.toFixed(2)} Player:${user.username} Bonus: 0%`,
                            type: 'In'
                        });
                    }
                } else {
                    bonus = amount * config.multiplier;
                    await Bonus.create({
                        userId: ObjectId(userId),
                        payuserId: ObjectId(payuserId),
                        amount: bonus,
                        type: bonusType,
                        status: config.status
                    });
                    if (payuser.role === 'cashier') {
                        await CashierHistory.create({
                            userId: ObjectId(payuserId),
                            content: `In: ${amount.toFixed(2)} Player: ${user.username} Bonus: ${config.multiplier * 100}%`,
                            type: 'In'
                        });
                    }
                }
            }
        } else {
            if (payuser.role === 'cashier') {
                await CashierHistory.create({
                    userId: ObjectId(payuserId),
                    content: `In: ${amount.toFixed(2)} Player: ${user.username}`,
                    type: 'In'
                });
            }
        }
        const result = await balanceUpdate({
            req,
            userId,
            amount,
            type: 'In',
            payuserId,
            typeDetail,
            bonus,
            bonusType
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error('Deposit error:', error);
        return res.status(500).json('Internal server error');
    }
};

export const withdraw = async (req: Request, res: Response) => {
    try {
        const { userId, amount, payuserId, bonusType = 'general' } = req.body;
        const user = await Users.findById(userId);
        const payuser = await Users.findById(payuserId);
        if (payuser.role !== 'admin' && user.parent[payuser.role] !== payuser.username) {
            return res.status(400).json('You are not allowed to withdraw from this user');
        }
        if (user.balance - user.wagerBonus < amount) {
            return res.status(400).json('Insufficient balance');
        }
        let bonus = 0;
        if (user.bonusType === 'cashback' || user.bonusType === 'happyhour') {
            await Bonus.updateMany(
                { userId: ObjectId(userId), type: user.bonusType },
                { $set: { status: 'cancel' } },
                { new: true }
            );
            await Users.findOneAndUpdate({ _id: ObjectId(userId) }, { bonus: 0, bonusType: 'general' });
            if (payuser.role === 'cashier') {
                await CashierHistory.create({
                    userId: ObjectId(payuserId),
                    content: `Out: ${-amount.toFixed(2)} Player: ${user.username}`,
                    type: 'Out'
                });
            }
        } else if (user.bonusType === 'wager') {
            await Bonus.findOneAndUpdate({ userId: ObjectId(userId), type: user.bonusType }, { $set: { status: 'cancel' } }, { new: true });
            await balanceUpdate({ req, userId, amount: -user.wagerBonus, type: 'Out', payuserId, typeDetail: 'Wager Bonus Cancel', bonusType, bonus });
            await Users.findOneAndUpdate({ _id: ObjectId(userId) }, { wagerBonus: 0, $inc: { bonusBalance: -user.wagerBonus } });
            if (payuser.role === 'cashier') {
                await CashierHistory.create({
                    userId: ObjectId(payuserId),
                    content: `Success: Player: ${user.username}. Bonus canceled successfully. ${-amount.toFixed(2)} + ${user.wagerBonus?.toFixed(2)}`,
                    type: 'Out'
                });
            }
        } else {
            if (payuser.role === 'cashier') {
                await CashierHistory.create({
                    userId: ObjectId(payuserId),
                    content: `Out: ${-amount.toFixed(2)} Player: ${user.username}`,
                    type: 'Out'
                });
            }
        }
        const result = await balanceUpdate({ req, userId, amount, type: 'Out', payuserId, typeDetail: 'withdraw', bonusType, bonus });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Withdraw error:', error);
        return res.status(500).json('Internal server error');
    }
};

export const changeBalance = async () => {
    try {
        const users = await Users.find({ role: 'player' });
        for (const user of users) {
            if (user.balance > 0) {
                if (user.wagerBonus > user.balance) {
                    await Users.findOneAndUpdate({ _id: user._id }, { creditBalance: 0, bonusBalance: user.balance });
                } else {
                    await Users.findOneAndUpdate({ _id: user._id }, { creditBalance: user.balance - user.wagerBonus, bonusBalance: user.wagerBonus });
                }
            }
        }
    } catch (e) {
        console.log(e, "error")
    }
}

