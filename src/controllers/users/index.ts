import * as md5 from 'md5';
import * as randomString from 'randomstring';
import { Request, Response } from 'express';
import { Users, Sessions, Permissions, LoginHistories } from '../../models';
import {
    signAccessToken,
    ObjectId,
    getIPAddress,
    sendEmail,
    getSessionTime,
    // usernameLimiter,
    maxFailsByLogin,
    // checkLimiter,
    // ipLimiter,
    getUserBalance,
} from '../base';
import { sign } from 'tweetnacl';
import { decode } from 'bs58';
import io from '../../socket';
import socket from '../../socket';

const userInfo = (user: any) => {
    return {
        _id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        balance: user.balance
    };
};

export const signin = async (req: Request, res: Response) => {
    const { password, email } = req.body;
    // const rlResIp = await ipLimiter.get(req.ip);
    // const rlResUsername = await usernameLimiter.get(email);
    // if (rlResUsername !== null && rlResUsername.consumedPoints > maxFailsByLogin) {
    //     const retrySecs = Math.round(rlResUsername.msBeforeNext / 1000);
    //     res.set('Retry-After', String(retrySecs));
    //     return res.status(429).send('Too Many Requests.');
    // } else if (rlResIp !== null && rlResIp.consumedPoints > maxFailsByLogin) {
    //     const retrySecs = Math.round(rlResIp.msBeforeNext / 1000) || 1;
    //     res.set('Retry-After', String(retrySecs));
    //     return res.status(429).send('Too Many Requests.');
    // } else {

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
        // checkLimiter(req, res);
        return res.status(400).json(`We can't find with this email or username.`);
    } else if (!user.validPassword(password, user.password)) {
        // checkLimiter(req, res);
        return res.status(400).json('Passwords do not match.');
    } else if (!user.status) {
        // checkLimiter(req, res);
        return res.status(400).json('Account has been blocked.');
    } else if (user.role !== 'player') {
        return res.status(400).json('You are not authorized to access this page.');
    } else {
        const session = signAccessToken(req, res, user._id);
        const LoginHistory = new LoginHistories({
            userId: user._id,
            ...session,
            data: req.body
        });
        await LoginHistory.save();
        await Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const userData = userInfo(user);
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

        // Validation checks
        if (emailExists) {
            return res.status(400).json(`${email} is used by another account.`);
        }
        if (usernameExists) {
            return res.status(400).json(`An account named '${username}' already exists.`);
        }

        // Create new user
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
        console.log("===error===")
        console.log(req.body)
        console.log(e)
    }
};

export const signout = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const result = await Sessions.deleteMany({ userId });
    res.json(result);
};

export const info = async (req: Request, res: Response) => {
    let result = {};
    if (req.body.update) {
        const { userId, email, username, avatar } = req.body;
        // const emailExists = await Users.findOne({
        //     _id: { $ne: ObjectId(userId) },
        //     email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') }
        // });
        // if (emailExists) {
        //     return res.status(400).json(`${email} is used by another account.`);
        // }
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
        // if (userData.publicAddress === email || userData.publicAddress === username) {
        //     const user = await Users.findByIdAndUpdate(ObjectId(userId), { avatar }, { new: true });
        //     result = userInfo(user);
        // } else {
        //     const user = await Users.findByIdAndUpdate(ObjectId(userId), req.body, {
        //         new: true
        //     });
        //     result = userInfo(user);
        // }
    } else {
        const user = await Users.findOneAndUpdate({ _id: ObjectId(req.body.userId), status: true }, req.body, { new: true });
        result = userInfo(user);
    }
    return res.json(result);

};

export const changePassword = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(ObjectId(userId));
    if (!user.validPassword(req.body['Current Password'], user.password)) {
        return res.status(400).json('Passwords do not match.');
    }
    const password = user.generateHash(req.body['New Password']);
    const result = await Users.findOneAndUpdate({ _id: ObjectId(userId), status: true }, { password }, { new: true });
    if (result) {
        return res.json('Success!');
    } else {
        return res.status(400).json('Server error.');
    }
};

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
