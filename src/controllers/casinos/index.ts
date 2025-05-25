
import 'dotenv/config';
import 'regenerator-runtime';
import { CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';
import { ObjectId } from '../base';

export const getCasinoGamesLists = async (req: Request, res: Response) => {
    const { id, provider, gname, page, pageSize, filter } = req.body;
    let query: any = { status: true }
    if (provider) {
        if (provider === 'tablegames') {
            query.Tags = { $in: ["Table Game"] }
        } else if (provider === 'fishing') {
            query.$or = [
                { SectionId: "fishing" },
                { SectionId: "spadegaming" }
            ];
        } else {
            query.SectionId = provider;
        }
    }
    if (filter) {
        query.Name = { $regex: new RegExp(filter.toLowerCase(), 'i') }
    }

    const [count, result] = await Promise.all([
        CasinoGameLists.countDocuments(query),
        page && pageSize
            ? CasinoGameLists.find(query, { Id: 1, Name: 1, SectionId: 1, aggregator: 1, Icon: 1, _id: 0 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
            : CasinoGameLists.find(query, { Id: 1, Name: 1, SectionId: 1, aggregator: 1, Icon: 1, _id: 0 })
    ]);

    return res.json({ result, count });
}

export const getFavoriteGame = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const user = await Users.findOne({ _id: ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.favoriteGame) {
            return res.json({ result: [] });
        }

        const result = await CasinoGameLists.find({ Id: { $in: user.favoriteGame } });
        return res.json({ result });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const getCasinoGamesListByCategory = async (req: Request, res: Response) => {
    const { id, gname, sort } = req.body;

    const result = await CasinoGameLists.find().limit(20);

    return res.json(result);
}

export const getCasinoProviders = async (req: Request, res: Response) => {
    let query = { status: true }
    const result = await CasinoProviders.find(query);
    return res.json(result)
}
