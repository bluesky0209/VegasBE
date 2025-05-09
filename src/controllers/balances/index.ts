import { Request, Response } from 'express';
import { Bonus, Users } from '../../models';
import { balanceUpdate, ObjectId } from '../base';
import { BONUSTYPE } from '../../config';

export const deposit = async (req: Request, res: Response) => {
    try {
        let { userId, amount, payuserId, bonusType = 'general' } = req.body;

        const [user, payuser] = await Promise.all([
            Users.findById(userId),
            Users.findById(payuserId)
        ]);

        if (!user || !payuser) {
            return res.status(404).json('User not found');
        }

        const hasPermission = payuser.role === 'admin' || user.parent[payuser.role] === payuser.username;
        if (!hasPermission) {
            return res.status(403).json('You are not allowed to deposit to this user');
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
            const bonusConfig: any = {
                cashback: {
                    multiplier: 0.2,
                    detail: 'Cashback Bonus',
                    status: 'pending'
                },
                happyhour: {
                    multiplier: 0.5,
                    detail: 'HappyHour Bonus',
                    status: 'pending'
                },
                wager: {
                    multiplier: 2,
                    detail: 'Wager Bonus',
                    status: 'confirmed'
                }
            };

            const config = bonusConfig[bonusType];
            if (config) {
                if (bonusType === 'wager') {
                    await Bonus.create({
                        userId: ObjectId(userId),
                        amount: amount,
                        payuserId: ObjectId(payuserId),
                        type: bonusType,
                        status: config.status
                    });
                    await Users.findOneAndUpdate({ _id: ObjectId(userId) }, { wagerBonus: amount });
                    await balanceUpdate({
                        req,
                        userId,
                        amount,
                        type: 'In',
                        payuserId,
                        typeDetail: 'Wager Bonus',
                        bonusType,
                        bonus: 0
                    });
                } else {
                    bonus = amount * config.multiplier;
                    await Bonus.create({
                        userId: ObjectId(userId),
                        payuserId: ObjectId(payuserId),
                        amount: bonus,
                        type: bonusType,
                        status: config.status
                    });
                }
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
        } else if (user.bonusType === 'wager') {
            await Bonus.findOneAndUpdate({ userId: ObjectId(userId), type: user.bonusType }, { $set: { status: 'cancel' } }, { new: true });
            await balanceUpdate({ req, userId, amount: -user.wagerBonus, type: 'Out', payuserId, typeDetail: 'Wager Bonus Cancel', bonusType, bonus });
            await Users.findOneAndUpdate({ _id: ObjectId(userId) }, { wagerBonus: 0 });
        }
        const result = await balanceUpdate({ req, userId, amount, type: 'Out', payuserId, typeDetail: 'withdraw', bonusType, bonus });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Withdraw error:', error);
        return res.status(500).json('Internal server error');
    }
};

