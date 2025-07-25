import { Request, Response } from "express";
import { Jackpots, Users } from "../../models";
import { Jackpothistories } from "../../models/payments/jackpothistories";

export const getJackpot = async (req: Request, res: Response) => {
    const jackpot = await Jackpots.findOne({});
    return res.json(jackpot);
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


export const spinJackpot = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(userId);
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }
    if (user.luckyNumber.length === 0) {
        return res.status(400).json({ message: 'User lucky number not found' });
    }

    const randomNumber = Math.floor(Math.random() * 50);
    const firstLuckyNumber = user.luckyNumber[0];
    const amount = firstLuckyNumber === randomNumber ? 5 : 2.5;

    const [updatedUser] = await Promise.all([
        Users.findByIdAndUpdate(userId, {
            $pull: { luckyNumber: firstLuckyNumber },
            $inc: { balance: amount }
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
        count: updatedUser.luckyNumber.length,
        luckyNumber: updatedUser.luckyNumber,
        balance: updatedUser.balance
    });
}
