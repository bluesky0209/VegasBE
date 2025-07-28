import { Request, Response } from "express";
import { Jackpots, Users } from "../../models";
import { Jackpothistories } from "../../models/payments/jackpothistories";

export const getJackpot = async (req: Request, res: Response) => {
    const { userId, cashier } = req.body;
    if (userId) {
        const user = await Users.findById(userId);
        const jackpot = await Jackpots.findOne({ cashier: user.parent.cashier });
        if (!jackpot) {
            const newJackpot = await Jackpots.create({
                gold: 100,
                silver: 50,
                bronze: 20,
                cashier: user.parent.cashier
            });
            return res.json(newJackpot);
        }
        return res.json(jackpot);
    } else if (cashier) {
        const jackpot = await Jackpots.findOne({ cashier });
        if (!jackpot) {
            const newJackpot = await Jackpots.create({
                gold: 100,
                silver: 50,
                bronze: 20,
                cashier
            });
            return res.json(newJackpot);
        }
        return res.json(jackpot);
    }
}

export const getJackpotHistory = async (req: Request, res: Response) => {
    const { parentId, page, pageSize } = req.body;
    const parentUser = await Users.findById(parentId);
    let query = {} as any;
    if (parentId && parentUser.role !== 'admin') {
        query['parent.' + parentUser.role] = parentUser.username;
    }
    const count = await Jackpothistories.countDocuments({ ...query });
    const jackpotHistory = await Jackpothistories.find({ ...query })
        .limit(pageSize)
        .skip((page - 1) * pageSize);
    return res.json({ results: jackpotHistory, count });
}

export const getJackpotNumber = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(userId);
    return res.json({ number: user.luckyNumber });
}

export const spinJackpot = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(userId);
    if (user.bonusType === 'wager') {
        return res.status(400).json({ message: 'Wager Bonus Active, Try again after you complete the wager bonus!' });
    }
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }
    if (user.luckyNumber.length === 0) {
        return res.status(400).json({ message: 'User lucky number not found' });
    }
    const jackpots = [3000, 1000, 250, 50, 15, 5];

    let randomNumber: any = [];
    let amount = 0;

    for (let i = 0; i < user.luckyNumber.length; i++) {
        let num;
        if (i < 3) {
            do {
                num = Math.floor(Math.random() * 50);
            } while (user.luckyNumber.includes(num));
            randomNumber.push(num);
        } else {
            num = Math.floor(Math.random() * 50);
            if (user.luckyNumber.includes(num)) {
                amount += jackpots[i];
            }
            randomNumber.push(num);
        }
    }

    if (user.luckyNumber.length === 6 && amount === 0) {
        amount = 2.5;
    }

    const [updatedUser] = await Promise.all([
        Users.findByIdAndUpdate(userId, {
            $set: { luckyNumber: [] },
            $inc: { balance: amount, bonusBalance: amount }
        }, { new: true }),
        Jackpothistories.create({
            userId,
            username: user.username,
            parent: user.parent,
            amount,
            type: 'lucky-spin'
        })
    ]);

    return res.json({
        number: randomNumber,
        balance: updatedUser.balance,
        amount: amount
    });
}
