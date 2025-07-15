import { ObjectId } from '../base';
import { CasinoBetHistory, Users } from '../../models';
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
        $unwind: '$user'
    },
    {
        $sort: { createdAt: -1 }
    }
];

export const get = async (req: Request, res: Response) => {
    const results = await CasinoBetHistory.aggregate(aggregateQuery as any);
    return res.json(results);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.aggregate([
        {
            $match: { _id: ObjectId(req.params.id) }
        },
        ...(aggregateQuery as any)
    ]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const {
        pageSize = null,
        page = null,
        userId = null,
        currency = null,
        status = null,
        provider = null,
        date = null,
        sort = null,
        cases = null,
        column = null,
        gameName = null,
        filter = null
    } = req.body;
    const adminUser = await Users.findById(userId);

    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }

    if (userId && adminUser.role !== 'admin') {
        query['parent.' + adminUser.role] = adminUser.username;
    }
    if (filter) {
        query.username = { $regex: filter, $options: 'i' }
    }
    if (provider) {
        query.provider = provider;
    }
    if (gameName) {
        query.gameName = gameName;
    }
    if (status) {
        query.type = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    console.log(query, "query")

    let count = await CasinoBetHistory.countDocuments(query);

    if (!pageSize || !page) {
        let results = await CasinoBetHistory.find(query).sort(sortQuery);
        return res.json({ results, count });
    } else {
        let results = await CasinoBetHistory.find(query)
            .sort(sortQuery)
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        return res.json({ results, count });
    }
};

export const reportByGame = async (req: Request, rep: Response) => {
    const { date, provider, gameId } = req.body;
    let query = {} as any;
    if (date) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (provider) {
        query.provider = provider;
    }
    if (gameId) {
        query.gameId = gameId;
    }

    const results = await CasinoBetHistory.aggregate([
        { $match: query },
        {
            $lookup: {
                from: "casino_gamelists",
                localField: "gameId",
                foreignField: "Id",
                as: "game"
            }
        },
        {
            $group: {
                _id: "$gameId",
                gameName: { $first: "$gameName" },
                gameId: { $first: "$gameId" },
                game: { $first: { $arrayElemAt: ["$game", 0] } },
                currency: { $first: "$currency" },
                totalBet: { $sum: "$bet" },
                totalWin: { $sum: "$win" },
                totalCount: { $sum: 1 }
            }
        }
    ]);

    return rep.json(results);
}

export const reportByPlayer = async (req: Request, res: Response) => {
    const { date, provider, gameId, username } = req.body;
    let query = {} as any;
    if (date) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (provider) {
        query.provider = provider;
    }
    if (gameId) {
        query.gameId = ObjectId(gameId);
    }
    if (username) {
        query.username = { $regex: username, $options: 'i' }
    }

    const results = await CasinoBetHistory.aggregate([
        { $match: query },
        {
            $group: {
                _id: "$username",
                username: { $first: "$username" },
                currency: { $first: "$currency" },
                totalBet: { $sum: "$bet" },
                totalWin: { $sum: "$win" },
                totalCount: { $sum: 1 }
            }
        }
    ]);

    return res.json(results);
}

export const csv = async (req: Request, res: Response) => {
    const {
        userId = null,
        currency = null,
        status = null,
        gameId = null,
        providerId = null,
        date = null,
        sort = null,
        column = null
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (currency) {
        query.currency = ObjectId(currency);
    }
    if (gameId) {
        query.gameId = ObjectId(gameId);
    }
    if (providerId) {
        query.providerId = ObjectId(providerId);
    }
    if (status) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const results = await CasinoBetHistory.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $sort: sortQuery },
        {
            $project: {
                Username: '$user.username',
                Email: '$user.email',
                Balance: {
                    $concat: [{ $convert: { input: '$balance', to: 'string' } }, ' ', '$currency.symbol']
                }
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await CasinoBetHistory.updateOne(query, req.body);
    const result = await CasinoBetHistory.aggregate([{ $match: query }, ...(aggregateQuery as any)]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};

export const deleteMany = async (req: Request, res: Response) => {
    const query = req.body;
    const result = await CasinoBetHistory.deleteMany(query);
    return res.json(result)
}