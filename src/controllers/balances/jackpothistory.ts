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



