import { ObjectId } from '../base';
import { CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';

export const get = async (req: Request, res: Response) => {
    const result = await CasinoProviders.find().sort({
        status: -1,
        createdAt: -1
    });
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.findOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};

export const list = async (req: Request, res: Response) => {
    const { pageSize = null, page = null, filter = null, userId = null, aggregator = null } = req.body;
    const admin = await Users.findOne({ _id: ObjectId(userId) });
    if (admin?.role !== 'admin') {
        return res.status(403).json('You are not allowed to access this data');
    }
    let query = {} as any;
    if (filter) {
        query.Name = { $regex: new RegExp(filter.toLowerCase(), 'i') }
    }
    if (aggregator) {
        query.aggregator = aggregator
    }
    const count = await CasinoProviders.countDocuments(query);
    if (!pageSize || !page) {
        const results = await CasinoProviders.find(query).sort({
            Status: -1,
            createdAt: -1
        });
        return res.json({ results, count });
    } else {
        const results = await CasinoProviders.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ Status: -1, createdAt: -1 });
        return res.json({ results, count });
    }
};

export const label = async (req: Request, res: Response) => {
    const results = await CasinoProviders.aggregate([
        {
            $match: {
                System: { $ne: '972' }
            }
        },
        {
            $project: {
                label: '$Name',
                value: '$System',
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
    const result = await CasinoProviders.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.findByIdAndUpdate({ _id: ObjectId(req.params.id) }, req.body, { new: true });
    if (result) {
        await CasinoGameLists.updateMany({ SectionId: result.Id }, req.body);
    }
    return res.json(result);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.deleteOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};
