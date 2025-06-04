import { Shifts, Users } from "../../models";
import { Payments } from "../../models/payments/payments";
import { ObjectId } from "../base";
import { Request, Response } from 'express';


const aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'payuserId',
            foreignField: '_id',
            as: 'payuser'
        }
    },
    {
        $unwind: '$user'
    },
    {
        $unwind: '$payuser'
    },
    {
        $sort: { createdAt: -1 }
    }
] as any;

export const get = async (req: Request, res: Response) => {
    const results = await Payments.aggregate(aggregateQuery);
    return res.json(results);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await Payments.aggregate([{ $match: { _id: ObjectId(req.params.id) } }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const {
        pageSize = null,
        page = null,
        userId = null,
        type = null,
        payuserId = null,
        sort = null,
        column = null,
        date = null,
        parentName,
        filter
    } = req.body;
    const adminUser = await Users.findById(userId);
    // if (adminUser.role !== 'admin') {

    // } else {

    // }
    // const parentUser = await Users.findOne({ username: parentName });
    // if (adminUser.role !== 'admin' && parentUser.parent[adminUser.role] !== adminUser.username) {
    //     return res.json({ error: "You are not authorized to access this data" });
    // }
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (userId && adminUser.role !== 'admin') {
        query['parent.' + adminUser.role] = adminUser.username;
    }
    if (filter) {
        query.username = { $regex: filter, $options: 'i' }
    }
    // if (type) {
    //     query.type = type;
    // }
    // if (payuserId) {
    //     query.payuserId = ObjectId(payuserId);
    // }
    // if (date && date[0] && date[1]) {
    //     query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    // }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }

    const count = await Payments.countDocuments(query);
    if (!pageSize || !page) {
        const results = await Payments.aggregate([{ $match: query }, ...aggregateQuery, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await Payments.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};

export const create = async (req: Request, res: Response) => {
    const result = await Payments.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await Payments.updateOne(query, req.body);
    const result = await Payments.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await Payments.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};

export const paymentReport = async (req: Request, res: Response) => {
    const { userId } = req.body;

    const results = await Payments.aggregate([

        {
            $match: {
                payuserId: ObjectId(userId),
                $or: [
                    { type: 'In', typeDetail: 'deposit' },
                    { type: 'Out', typeDetail: 'withdraw' }
                ]
            }
        },
        {
            $group: {
                _id: null,
                totalIn: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'In'] }, '$amount', 0]
                    }
                },
                totalOut: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'Out'] }, '$amount', 0]
                    }
                },
            }
        },
        {
            $project: {
                _id: 0,
                totalIn: 1,
                totalOut: 1,
                total: { $add: ['$totalIn', '$totalOut'] },
            }
        }
    ]);
    return res.json(results[0]);
};

export const report = async (req: Request, res: Response) => {
    const { date } = req.body;
    let query = {} as any;
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }

    const results = await Payments.aggregate([
        {
            $match: {
                ...query,
                $or: [
                    { type: 'In', typeDetail: 'deposit' },
                    { type: 'Out', typeDetail: 'withdraw' }
                ]
            }
        },
        {
            $group: {
                _id: null,
                totalDeposit: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$type', 'In'] },
                                    { $eq: ['$typeDetail', 'deposit'] }
                                ]
                            },
                            '$amount',
                            0
                        ]
                    }
                },
                totalWithdraw: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$type', 'Out'] },
                                    { $eq: ['$typeDetail', 'withdraw'] }
                                ]
                            },
                            { $multiply: ['$amount', -1] },
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalDeposit: 1,
                totalWithdraw: 1,
                total: { $subtract: ['$totalDeposit', '$totalWithdraw'] }
            }
        }
    ]);

    return res.json(results[0] || { totalDeposit: 0, totalWithdraw: 0, total: 0 });
};

export const resetPayments = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(userId);
    await Shifts.create({
        userId: ObjectId(userId),
        cashier: user.username,
        in: user.in,
        out: user.out,
        sum: user.in - user.out
    });
    await Users.findByIdAndUpdate(ObjectId(userId), { $set: { in: 0, out: 0 } });
    return res.json({ status: true });
};

export const getShifts = async (req: Request, res: Response) => {
    const { userId, page, pageSize } = req.body;
    const count = await Shifts.countDocuments({ userId: ObjectId(userId) });
    const results = await Shifts.find({ userId: ObjectId(userId) }).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize);
    return res.json({ results, count });
};

export const paymentReportSuperAgent = async (req: Request, res: Response) => {
    const { date, username } = req.body;
    let query = {} as any;
    if (date?.length === 2) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (username) {
        query.username = username;
    }

    const results = await Payments.aggregate([
        { $match: query },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        { $match: { 'user.role': 'superagent' } },
        {
            $group: {
                _id: {
                    userId: '$user._id',
                    username: '$user.username'
                },
                totalDeposit: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$type', 'In'] },
                                    { $eq: ['$typeDetail', 'deposit'] }
                                ]
                            },
                            '$amount',
                            0
                        ]
                    }
                },
                totalWithdraw: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$type', 'Out'] },
                                    { $eq: ['$typeDetail', 'withdraw'] }
                                ]
                            },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                userId: '$_id.userId',
                username: '$_id.username',
                totalDeposit: 1,
                totalWithdraw: 1,
                total: { $subtract: ['$totalDeposit', '$totalWithdraw'] }
            }
        }
    ]);

    await Promise.all(results.map(async result => {
        const [agent] = await Payments.aggregate([
            { $match: { payuserId: ObjectId(result.userId) } },
            {
                $group: {
                    _id: null,
                    totalDeposit: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$type', 'In'] }, { $eq: ['$typeDetail', 'deposit'] }] },
                                '$amount',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        if (agent) {
            result.agentDeposit = agent.totalDeposit;
        }
    }));

    return res.json(results || []);
}

export const paymentReportUser = async (req: Request, res: Response) => {
    const { userId, date, page, pageSize } = req.body;
    let query = {} as any;
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const result = await Payments.aggregate([
        { $match: query },
        {
            $match: {
                payuserId: ObjectId(userId),
                $or: [
                    {
                        type: 'In'
                    },
                    {
                        type: 'Out',
                        typeDetail: 'withdraw'
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $group: {
                _id: {
                    username: '$username',
                    name: '$user.name'
                },
                In: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$type', 'In'] }, { $eq: ['$typeDetail', 'deposit'] }] }, '$amount', 0]
                    }
                },
                Out: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'Out'] }, '$amount', 0]
                    }
                },
                bonus: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $eq: ['$type', 'In'] },
                                { $in: ['$typeDetail', ['Wager Bonus', 'Happy Hour Bonus', 'Cashback Bonus', 'Wager Bonus Cancel', 'Happy Hour Bonus Cancel', 'Cashback Bonus Cancel']] }
                            ]
                        }, '$amount', 0]
                    }
                },
            }
        },
        {
            $project: {
                _id: 0,
                username: '$_id.username',
                name: '$_id.name',
                In: 1,
                Out: 1,
                bonus: 1
            }
        }
    ]);

    const results = await Payments.aggregate([
        { $match: query },
        {
            $match: {
                payuserId: ObjectId(userId),
                $or: [
                    {
                        type: 'In'
                    },
                    {
                        type: 'Out',
                        typeDetail: 'withdraw'
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $group: {
                _id: {
                    username: '$username',
                    name: '$user.name'
                },
                In: {
                    $sum: {
                        $cond: [{ $and: [{ $eq: ['$type', 'In'] }, { $eq: ['$typeDetail', 'deposit'] }] }, '$amount', 0]
                    }
                },
                Out: {
                    $sum: {
                        $cond: [{ $eq: ['$type', 'Out'] }, '$amount', 0]
                    }
                },
                bonus: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $eq: ['$type', 'In'] },
                                { $in: ['$typeDetail', ['Wager Bonus', 'Happy Hour Bonus', 'Cashback Bonus', 'Wager Bonus Cancel', 'Happy Hour Bonus Cancel', 'Cashback Bonus Cancel']] }
                            ]
                        }, '$amount', 0]
                    }
                },
            }
        },
        {
            $project: {
                _id: 0,
                username: '$_id.username',
                name: '$_id.name',
                In: 1,
                Out: 1,
                bonus: 1
            }
        },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize }
    ]);
    return res.json({ results, count: result.length });
};



export const paymentsList = async (req: Request, res: Response) => {
    const {
        pageSize = null,
        page = null,
        userId = null,
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;

    if (userId) {
        query.userId = ObjectId(userId);
    }

    const count = await Payments.countDocuments(query);
    if (!pageSize || !page) {
        const results = await Payments.aggregate([{ $match: query }, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await Payments.aggregate([
            { $match: query },
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};
