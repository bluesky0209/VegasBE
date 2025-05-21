import * as md5 from 'md5';
import * as randomString from 'randomstring';
import { Request, Response } from 'express';
import { Users, Sessions, Permissions, LoginHistories } from '../../models';
import {
    signAccessToken,
    ObjectId,
    getIPAddress
} from '../base';

const userInfo = (user: any) => {
    return {
        _id: user._id,
        email: user.email,
        username: user.username,
        balance: user.balance,
        bonus: user.bonus,
        wagerBonus: user.wagerBonus,
        name: user.name,
        luckyNumber: user.luckyNumber
    };
};

export const signin = async (req: Request, res: Response) => {
    try {
        const { password, email } = req.body;
        const ip = getIPAddress(req);
        const user = await Users.findOne({
            $or: [
                {
                    username: {
                        $regex: new RegExp('^' + email.toLowerCase(), 'i')
                    }
                },
                {
                    email: {
                        $regex: new RegExp('^' + email.toLowerCase(), 'i')
                    }
                }
            ]
        });
        if (!user) {
            return res.status(400).json(`We can't find with this email or username.`);
        } else if (!user.validPassword(password, user.password)) {
            return res.status(400).json('Passwords do not match.');
        } else if (!user.status) {
            return res.status(400).json('Account has been blocked.');
        } else if (user.role !== 'player') {
            return res.status(400).json('You are not authorized to access this page.');
        } else {
            const session = signAccessToken(req, res, user._id);
            await Promise.all([
                Users.updateOne({ _id: ObjectId(user._id) }, { $set: { active: true, ip: ip.ip } }),
                LoginHistories.create({
                    userId: user._id,
                    ...session,
                    data: req.body
                }),
                await Sessions.updateOne({ userId: user._id }, session, {
                    new: true,
                    upsert: true
                })
            ]);
            const userData = userInfo(user);
            const sessionData = {
                accessToken: session.accessToken,
                refreshToken: session.refreshToken
            };
            return res.json({
                status: true,
                session: sessionData,
                user: userData
            });
        }
    } catch (e) {
        console.log(e)
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, username, password, rReferral } = req.body;
        const ip = getIPAddress(req);

        const [emailExists, usernameExists, permission] = await Promise.all([
            Users.findOne({
                email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') }
            }),
            Users.findOne({
                username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') }
            }),
            Permissions.findOne({ title: 'player' })
        ]);

        if (emailExists) {
            return res.status(400).json(`${email} is used by another account.`);
        }
        if (usernameExists) {
            return res.status(400).json(`An account named '${username}' already exists.`);
        }

        const iReferral = randomString.generate(10);
        const newuser = new Users({
            ...req.body,
            ...ip,
            iReferral,
            password: Users.prototype.generateHash(password),
            permissionId: permission._id,
            status: true
        });
        newuser.save()
        return res.json('You have successfully created in as a user');

    } catch (e) {
        console.log(e)
    }
};

export const signout = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        console.log(userId, "userId")
        const [result] = await Promise.all([
            Sessions.deleteMany({ userId }),
            Users.updateOne({ _id: ObjectId(userId) }, { $set: { active: false } })
        ]);
        res.json(result);
    } catch (e) {
        console.log(e)
    }
};

export const info = async (req: Request, res: Response) => {
    try {
        let result = {};
        if (req.body.update) {
            const { userId, email, username, avatar } = req.body;
            const usernameExists = await Users.findOne({
                _id: { $ne: ObjectId(userId) },
                username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') }
            });
            if (usernameExists) {
                return res.status(400).json(`An account named '${username}' already exists.`);
            }
            const userData = await Users.findById(ObjectId(userId));
            if (!userData.status) {
                return res.status(400).json('Account has been blocked.');
            }
            const user = await Users.findByIdAndUpdate(ObjectId(userId), req.body, { new: true });
            result = userInfo(user);
        } else {
            const user = await Users.findOneAndUpdate({ _id: ObjectId(req.body.userId), status: true }, req.body, { new: true });
            result = userInfo(user);
        }
        return res.json(result);
    } catch (e) {
        console.log(e)
    }

};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const user = await Users.findById(ObjectId(userId));
        if (!user.validPassword(req.body['currentpass'], user.password)) {
            return res.status(400).json('Passwords do not match.');
        }
        const password = user.generateHash(req.body['newpass']);
        const result = await Users.findOneAndUpdate({ _id: ObjectId(userId), status: true }, { password }, { new: true });
        if (result) {
            return res.json('Success!');
        } else {
            return res.status(400).json('Server error.');
        }
    } catch (e) {
        console.log(e)
    }
};

export const changeEmail = async (req: Request, res: Response) => {
    try {
        const { userId, email } = req.body;
        const emailExists = await Users.findOne({
            _id: { $ne: ObjectId(userId) },
            email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') }
        });
        if (emailExists) {
            return res.status(400).json(`${email} is used by another account.`);
        }
        const user = await Users.findById(ObjectId(userId));
        if (!user) return res.status(400).json('User not found');
        user.email = email;
        await user.save();
        return res.json({ status: true, message: 'Email changed successfully.' });
    } catch (e) {
        console.log(e);
        return res.status(400).json(e);
    }
}

export const passwordReset = async (req: Request, res: Response) => {
    const { userId, token, password } = req.body;
    const user = await Users.findById(userId);
    if (!user) return res.status(400).json('invalid link or expired');
    const sessions = await Sessions.findOne({
        userId: user._id,
        passwordToken: token
    });
    if (!sessions) return res.status(400).json('Invalid link or expired');
    user.password = user.generateHash(password);
    await user.save();
    await sessions.delete();
    return res.json('password reset sucessfully.');
};
