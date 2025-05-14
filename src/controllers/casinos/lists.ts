import { ObjectId } from '../base';
import { CasinoGameLists, Users } from '../../models';
import { Request, Response } from 'express';
import { getGameListSkyxspin } from './skyxspin';
import { getGameListC2Gaming } from './api';

export const get = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.find().sort({ status: -1, order: 1, createdAt: -1 });
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.findOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};

//admin panel game lists
export const list = async (req: Request, res: Response) => {
    const { pageSize = null, page = null, provider = null, update = false, filter, aggregator, userId } = req.body;
    const user = await Users.findOne({ _id: ObjectId(userId) });

    if (user.role !== 'admin') {
        return res.status(403).json('You are not allowed to access this page');
    }
    if (update) {
        await getGameListSkyxspin();
        await getGameListC2Gaming({ id: 1744970985003, BankGroupId: 'GoldenBet_USD' });
    }
    let query = {} as any;
    if (provider && provider !== 'all') {
        query.SectionId = provider;
    }
    if (filter) {
        query.Name = { $regex: new RegExp(filter.toLowerCase(), 'i') }
    }
    if (aggregator) {
        query.aggregator = aggregator;
    }
    const count = await CasinoGameLists.countDocuments(query);
    if (!pageSize || !page) {
        const results = await CasinoGameLists.find(query);
        return res.json({ results, count });
    } else {
        const results = await CasinoGameLists.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize);
        return res.json({ results, count });
    }
};

export const label = async (req: Request, res: Response) => {
    const results = await CasinoGameLists.aggregate([
        {
            $match: { status: true }
        },
        {
            $project: {
                label: '$symbol',
                value: '$_id',
                _id: 0
            }
        },
        {
            $sort: {
                label: 1
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.findByIdAndUpdate(ObjectId(req.params.id), req.body, { new: true });
    return res.json(result);
};

export const updateMany = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.insertMany(req.body);
    return res.json(result);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};
