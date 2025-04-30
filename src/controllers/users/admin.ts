import { Request, Response } from 'express';
import {
    // checkLimiter, 
    // usernameLimiter, 
    // ipLimiter,
    maxFailsByLogin, ObjectId, signAccessToken,
} from '../base';
import {
    CasinoBetHistory,
    LoginHistories,
    Permissions,
    Sessions,
    Users
} from '../../models';
import { setPlayer } from '../casinos/api';

const aggregateQuery = [
    {
        $lookup: {
            from: 'permissions',
            localField: 'permissionId',
            foreignField: '_id',
            as: 'permission'
        }
    },
    {
        $lookup: {
            from: 'balances',
            localField: '_id',
            foreignField: 'userId',
            as: 'balance'
        }
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'balance.currency',
            foreignField: '_id',
            as: 'currency'
        }
    },
    {
        $unwind: '$permission'
    },
    {
        $project: {
            'currency.abi': 0
        }
    },
    {
        $sort: { createdAt: 1 }
    }
] as any;

export const signin = async (req: Request, res: Response) => {
    const { password, username } = req.body;
    if (!password || !username) return res.status(400).json('Invalid field!');
    if (!req.headers.admin) return res.status(400).json(`You can't access here.`);
    const user = await Users.findOne({
        $or: [
            {
                username: {
                    $regex: new RegExp('^' + username.toLowerCase(), 'i')
                }
            },
            {
                email: {
                    $regex: new RegExp('^' + username.toLowerCase(), 'i')
                }
            }
        ]
    });
    if (!user) {
        // checkLimiter(req, res);
        return res.status(400).json(`We can't find with this email or username.`);
    } else if (user.permissionId.title !== 'admin') {
        // checkLimiter(req, res);
        return res.status(400).json(`You can't access here.`);
    } else if (!user.validPassword(password, user.password)) {
        // checkLimiter(req, res);
        return res.status(400).json('Passwords do not match.');
    } else if (!user.status) {
        // checkLimiter(req, res);
        return res.status(400).json('Account has been blocked.');
    } else {
        const session = signAccessToken(req, res, user._id);
        // const LoginHistory = new LoginHistories({
        //     userId: user._id,
        //     ...session
        // });
        // await LoginHistory.save();
        await Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const userData = {
            _id: user._id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            cryptoAccount: user.cryptoAccount,
            publicAddress: user.publicAddress,
            oddsformat: user.oddsformat,
            token: process.env.ADMIN_TOKEN
        };
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
        };
        // await usernameLimiter.delete(email);
        return res.json({
            status: true,
            session: sessionData,
            user: userData
        });
    }
    // }
};

export const signup = async (req: Request, res: Response) => {
    if (req.headers.password !== process.env.ADMIN_PASSWORD?.toString()) return res.status(400).json(`You can't access here.`);
    const user = req.body;
    const emailExists = await Users.findOne({
        email: { $regex: new RegExp('^' + user.email.toLowerCase(), 'i') }
    });
    if (emailExists) {
        return res.status(400).json(`${user.email} is used by another account.`);
    }
    const usernameExists = await Users.findOne({
        username: { $regex: new RegExp('^' + user.username.toLowerCase(), 'i') }
    });
    if (usernameExists) {
        return res.status(400).json(`An account named '${user.username}' already exists.`);
    }

    let newuser = new Users(user);
    const permission = await Permissions.findOne({ title: 'admin' });
    newuser.password = newuser.generateHash(user.password);
    newuser.permissionId = permission._id;
    newuser.status = true;

    const u_result = await newuser.save();
    if (!u_result) {
        return res.status(400).json('error');
    } else {
        const populatedUser = await Users.findById(u_result._id).populate('permissionId', 'title');
        return res.json({
            message: 'You have successfully created in as a user.',
            user: populatedUser
        });
    }
};
export const createUser = async (req: Request, res: Response) => {
    try {
        const user = req.body;
        // const emailExists = await Users.findOne({
        //     email: { $regex: new RegExp('^' + user.email.toLowerCase(), 'i') }
        // });
        // if (emailExists) {
        //     return res.status(400).json(`${user.email} is used by another account.`);
        // }
        const usernameExists = await Users.findOne({
            username: { $regex: new RegExp('^' + user.username.toLowerCase(), 'i') }
        });
        if (usernameExists) {
            return res.status(400).json(`An account named '${user.username}' already exists.`);
        }

        let newuser = new Users(user);
        newuser.password = newuser.generateHash(user.password);
        newuser.permissionId = ObjectId(user.permissionId);
        newuser.status = true;
        let c2gaming = await setPlayer({ Id: user.username, BankGroupId: 'GoldenBet_USD', Nick: user.username });
        if (!c2gaming) {
            c2gaming = await setPlayer({ Id: user.username, BankGroupId: 'GoldenBet_USD', Nick: user.username });
        }
        if (!c2gaming) {
            return res.status(400).json('error');
        }
        const u_result = await newuser.save();
        if (!u_result) {
            return res.status(400).json('error');
        } else {
            const populatedUser = await Users.findById(u_result._id).populate('permissionId', ['title']).lean().then(doc => {
                if (doc && doc.permissionId) {
                    doc.permission = doc.permissionId;
                    delete doc.permissionId;
                }
                return doc;
            });
            return res.json(
                populatedUser
            );
        }
    } catch (e) {
        console.log(e);
        return res.status(400).json('error');
    }
};

export const signout = async (req: Request, res: Response) => {
    const { userId } = req.body;
    await Sessions.deleteMany({ userId });
    res.json({ status: true });
};

export const changePassword = async (req: Request, res: Response) => {
    const { userId, newpass } = req.body;
    const user = await Users.findById(ObjectId(userId));
    const password = user.generateHash(newpass);
    const result = await Users.findByIdAndUpdate(ObjectId(userId), { password }, { new: true });
    const session = await Sessions.findOneAndDelete({ userId });
    if (session && session.socketId) {
        req.app.get('io').to(session.socketId).emit('logout');
    }
    if (result) {
        return res.json('Success!');
    } else {
        return res.status(400).json('Server error.');
    }
};

export const get = async (req: Request, res: Response) => {
    const result = await Users.aggregate(aggregateQuery);
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await Users.aggregate([
        {
            $match: {
                _id: ObjectId(req.params.id)
            }
        },
        ...aggregateQuery
    ]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const { status, pageSize = null, page = null, userId = null, permission = null, date = null, country = null } = req.body;
    let query = {} as any;
    if (userId) {
        query._id = ObjectId(userId);
    }
    if (permission) {
        query.permissionId = ObjectId(permission);
    }
    if (country) {
        query.country = {
            $regex: new RegExp('^' + country.toLowerCase(), 'i')
        };
    }
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const count = await Users.countDocuments(query);
    if (!pageSize || !page) {
        const results = await Users.aggregate([{ $match: query }, ...aggregateQuery]);
        return res.json({ results, count });
    } else {
        const results = await Users.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};

export const label = async (req: Request, res: Response) => {
    const results = await Users.aggregate([
        {
            $project: {
                label: '$username',
                value: '$_id',
                icon: '$avatar',
                _id: 0
            }
        },
        {
            $sort: {
                label: 1,
            }
        }
    ]);
    return res.json(results);
};

export const addlabel = async (req: Request, res: Response) => {
    const results = await Users.aggregate([
        {
            $project: {
                label: '$username',
                value: '$publicAddress',
                id: '$_id',
                icon: '$avatar',
                _id: 0
            }
        },
        {
            $sort: {
                label: 1,
            }
        }
    ]);
    return res.json(results);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await Users.updateOne(query, req.body);
    const result = await Users.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const userId = ObjectId(req.params.id);
    const result = await Users.deleteOne({ _id: userId });
    await Sessions.deleteMany({ userId });
    await CasinoBetHistory.deleteMany({ userId });
    await LoginHistories.deleteMany({ userId });
    return res.json(result);
};
