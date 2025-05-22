
import 'dotenv/config';
import 'regenerator-runtime';
import { CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

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
    const count = await CasinoGameLists.countDocuments(query);
    let result;

    if (page && pageSize) {
        result = await CasinoGameLists.find(query)
            .skip((page - 1) * pageSize)
            .limit(pageSize);
    } else {
        result = await CasinoGameLists.find(query);
    }

    return res.json({ result, count });
}

export const getFavoriteGame = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findOne({ _id: userId });
    const result = await CasinoGameLists.find({ Id: { $in: user.favoriteGame } });
    return res.json({ result });
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
