import { Request, Response } from 'express';
import {
    balanceUpdate,
    decrypt,
    encrypt,
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
import { deposit } from '../balances';

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
        $unwind: '$permission'
    },
    {
        $sort: { createdAt: 1 }
    }
] as any;

//admin panel login
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
    } else if (user.role !== 'cashier') {
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
            name: user.name,
            permission: user.permissionId,
            role: user.role,
            avatar: user.avatar,
            balance: user.balance,
            token: process.env.CASHIER_TOKEN
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

export const create = async (req: Request, res: Response) => {
    const { role, userId, username, password, permissionId, balance, bonusType, name } = req.body;
    try {
        const permission = await Permissions.findById(ObjectId(permissionId));
        const createRole = await Permissions.findOne({ title: role });
        if (createRole.order !== permission.order + 1) {
            return res.status(403).json('You can\'t create this role.');
        }
        const usernameExists = await Users.findOne({
            username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') }
        });
        if (usernameExists) {
            return res.status(400).json(`An account named '${username}' already exists.`);
        }

        // Update parent user's count
        const parentUser = await Users.findByIdAndUpdate(
            ObjectId(userId),
            { $inc: { [`count.${role.toLowerCase()}`]: 1 } }
        );

        // Update all parent users' counts recursively
        const updateParentCounts = async (parentPermissions: any) => {
            for (const [roles, username] of Object.entries(parentPermissions)) {
                await Users.findOneAndUpdate(
                    { username },
                    { $inc: { [`count.${role.toLowerCase()}`]: 1 } }
                );
            }
        };
        await updateParentCounts(parentUser.parent);

        const parentPermissions = { ...parentUser.parent, [permission.title]: parentUser.username };

        let newuser = new Users({
            username,
            password,
            permissionId: createRole._id,
            role,
            parent: parentPermissions
        });
        newuser.password = newuser.generateHash(password);
        newuser.status = true;
        const lastUser = await Users.findOne().sort({ id: -1 });
        newuser.id = (lastUser?.id || 0) + 1;
        newuser.name = name ?? username;
        if (createRole.title === 'player') {
            let c2gaming = await setPlayer({ Id: username, BankGroupId: 'GoldenBet_USD', Nick: username });
            if (!c2gaming) {
                c2gaming = await setPlayer({ Id: username, BankGroupId: 'GoldenBet_USD', Nick: username });
            }
            if (!c2gaming) {
                return res.status(400).json('error');
            }
        }
        let u_result = await newuser.save();
        if (balance > 0) {
            req.body.payuserId = userId;
            req.body.amount = balance;
            req.body.userId = u_result._id;
            req.body.bonusType = bonusType;
            u_result = await deposit(req, res);
        }
        if (!u_result) {
            return res.status(400).json('error');
        } else {
            const result = await Users.aggregate([
                { $match: { _id: u_result._id } },
                ...aggregateQuery
            ]);
            return res.json(result[0]);
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

//admin -> users list
export const list = async (req: Request, res: Response) => {
    try {
        const { status, pageSize, page, userId, parentId, playerId, date, role, permissionId, search } = req.body;

        // Check permissions
        const permission = await Permissions.findById(ObjectId(permissionId));
        const findRole = await Permissions.findOne({ title: role });
        if (findRole.order <= permission.order) {
            return res.status(403).json('You are not authorized to access this page.');
        }

        // Build query
        const query: any = {};

        if (role) {
            query.role = role;
        }

        if (search) {
            query.username = { $regex: new RegExp(search.toLowerCase(), 'i') };
        }

        if (permission.title !== 'admin' && parentId) {
            const parent = await Users.findById(ObjectId(parentId));
            query['parent.' + permission.title] = parent.username;
        }

        if (playerId) {
            query._id = ObjectId(playerId);
        }

        if (status !== '' && status !== undefined) {
            query.status = status;
        }

        if (date && date[0] && date[1]) {
            query.createdAt = {
                $gte: new Date(date[0]),
                $lte: new Date(date[1])
            };
        }
        // Get total count
        const count = await Users.countDocuments(query);

        // Get paginated results
        const aggregatePipeline = [
            { $match: query },
            ...(pageSize && page ? [
                ...aggregateQuery,
                { $skip: (page - 1) * pageSize },
                { $limit: pageSize }
            ] : [])
        ];

        const results = await Users.aggregate(aggregatePipeline);

        // Decrypt passwords
        const decryptedResults = results.map(user => ({
            ...user,
            password: decrypt(user.password)
        }));

        return res.json({ results: decryptedResults, count });

    } catch (e) {
        console.log(e, "error");
        return res.status(500).json('Server error');
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
    let { username, password, permissionId } = req.body;
    password = encrypt(password);
    const query = { _id: ObjectId(req.params.id) };
    await Users.updateOne(query, { username, password, permissionId });
    const result = await Users.aggregate([{ $match: query }, ...aggregateQuery]);
    result[0].password = decrypt(result[0].password);
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
