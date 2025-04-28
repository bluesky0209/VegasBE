
import 'dotenv/config';
import 'regenerator-runtime';
import { CasinoBetHistory, CasinoCategories, CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';
import { CronJob } from 'cron';
import moment = require('moment-timezone');

export const getCasinoGamesLists = async (req: Request, res: Response) => {
    const { id, provider, gname, page = 1, pageSize = 20, sort } = req.body;
    let query: any = { status: true }
    if (provider) {
        if (provider === 'tablegames') {
            query.Tags = { $in: ["Table Game"] }
        } else if (provider === 'fishing') {
            query.$or = [
                { Description: "fish" },
                { Name: { $regex: 'Fish', $options: 'i' } }
            ];
        } else if (provider === 'pragmatic') {
            query.$or = [
                { aggregator: 'skyxspin', Id: { $regex: '^pp_' } }
            ];
        } else {
            query.SectionId = provider;
        }
    }
    const count = await CasinoGameLists.countDocuments(query);
    const result = await CasinoGameLists.find(query)
        .skip((page - 1) * pageSize)
        .limit(pageSize);

    return res.json({ result, count });
}

export const getCasinoGamesListByCategory = async (req: Request, res: Response) => {
    const { id, gname, sort } = req.body;

    const result = await CasinoGameLists.find().limit(20);

    return res.json(result);
}

export const getCasinoProviders = async (req: Request, res: Response) => {
    let query = { Categories: req.body.id, Status: true }
    const result = await CasinoProviders.aggregate([
        {
            $match: query,
        },
        {
            $addFields: {
                isSystem960: { $eq: ['$System', '960'] },
            },
        },
        {
            $sort: {
                isSystem960: -1,
            },
        },
    ]);
    return res.json(result)
}
