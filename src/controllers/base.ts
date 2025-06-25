import * as fs from 'fs';
import * as md5 from 'md5';
import * as crypto from 'crypto';
import * as geoip from 'geoip-country';
import * as requestIp from 'request-ip';
import * as nodemailer from 'nodemailer';
import * as moment from 'moment-timezone';
import * as bcrypt from 'bcrypt-nodejs';
import 'dotenv/config';
import mongoose, { ObjectId as ObjectIdType } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { Sessions, Users, Payments, Bonus, Jackpots, Jackpothistories } from '../models';
const config = require('../../config');

export const maxFailsByLogin = 3;

export const ObjectId = (id: string) => {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (error) {
        console.log('ObjectId', id);
    }
};

export const globalTime = () => {
    return moment.tz(new Date(), process.env.TIME_ZONE as string);
};

export const getSessionTime = () => {
    const time = new Date(new Date().valueOf() + parseInt(process.env.SESSION as string));
    return moment.tz(time, process.env.TIME_ZONE as string);
};

export const encrypt = (text: string) => {
    let iv = crypto.randomBytes(Number(process.env.IV_LENGTH));
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY as string), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + '::' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
    try {
        let textParts = text.split('::');
        let iv = Buffer.from(textParts.shift() as string, 'hex');
        let encryptedText = Buffer.from(textParts.join('::'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY as string), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return '';
    }
};

export const decryptPassword = (password: string, hash: string): boolean => {
    return bcrypt.compareSync(password, hash);
};

export const getIPAddress = (req: Request) => {
    let ip = requestIp.getClientIp(req);
    if (ip) {
        ip = ip.replace('::ffff:', '');
    }
    const geo = geoip.lookup(ip as string);
    return { ip, useragent: req.useragent, ...geo };
};

export const signAccessToken = (req: Request, res: Response, userId: string): any => {
    try {
        if (userId) {
            const expiration = getSessionTime();
            const accessToken = md5(userId + expiration);
            const refreshToken = md5(userId + expiration);
            const ip = getIPAddress(req);
            return { accessToken, refreshToken, expiration, userId, ...ip };
        }
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

export const dataSave = async (data: any, model: any) => {
    const savehandle = new model(data);
    return await savehandle.save().then((result: any) => {
        if (!result) {
            return false;
        } else {
            return result;
        }
    });
};

export const NumberFix = (number: number, decimal = 10): number => {
    return Number(Number(number).toFixed(decimal));
};

const calculateJackpot = async (amount: number) => {
    const random = Math.random();
    let jackpotWon = null;
    let jackpotAmount = 0;

    if (random < 0.00001) {
        jackpotWon = 'gold';
    } else if (random < 0.0001) {
        jackpotWon = 'silver';
    } else if (random < 0.001) {
        jackpotWon = 'bronze';
    }

    const updatedJackpot = await Jackpots.findOneAndUpdate({}, {
        $inc: {
            goldbet: amount,
            silverbet: amount,
            bronzebet: amount
        }
    });

    const updatePromises = [];

    if (updatedJackpot.goldbet >= 100) {
        updatePromises.push(
            Jackpots.findOneAndUpdate({}, {
                $inc: { gold: 3 },
                $set: { goldbet: 0 }
            })
        );
    }

    if (updatedJackpot.silverbet >= 100) {
        updatePromises.push(
            Jackpots.findOneAndUpdate({}, {
                $inc: { silver: 2 },
                $set: { silverbet: 0 }
            })
        );
    }

    if (updatedJackpot.bronzebet >= 100) {
        updatePromises.push(
            Jackpots.findOneAndUpdate({}, {
                $inc: { bronze: 1 },
                $set: { bronzebet: 0 }
            })
        );
    }

    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
    }

    if (jackpotWon) {
        if (jackpotWon === 'gold') {
            jackpotAmount = updatedJackpot.gold;
            await Jackpots.findOneAndUpdate({}, { $set: { gold: 5 } });
        } else if (jackpotWon === 'silver') {
            jackpotAmount = updatedJackpot.silver;
            await Jackpots.findOneAndUpdate({}, { $set: { silver: 3 } });
        } else if (jackpotWon === 'bronze') {
            jackpotAmount = updatedJackpot.bronze;
            await Jackpots.findOneAndUpdate({}, { $set: { bronze: 1 } });
        }
        return {
            type: jackpotWon,
            amount: jackpotAmount
        };
    }
    return null;
}

export const addFavoriteGame = async ({
    PlayerId,
    GameId
}: {
    PlayerId: string;
    GameId: string;
}) => {
    const user = await Users.findOne({ username: PlayerId });
    let favoriteGames = user.favoriteGame || [];

    if (!favoriteGames.includes(GameId)) {
        favoriteGames.push(GameId);
        if (favoriteGames.length > 10) {
            favoriteGames.shift();
        }
        await Users.findByIdAndUpdate(user._id, { favoriteGame: favoriteGames });
    }
}

const giveDailyBonus = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bonus = await Bonus.findOne({
        userId: ObjectId(userId),
        type: 'daily',
        createdAt: { $gte: today }
    });
    const lastDeposit = await Payments.findOne({
        userId: ObjectId(userId),
        type: 'In',
        typeDetail: 'deposit',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const canCollectBonus = !bonus && lastDeposit;

    if (canCollectBonus) {
        await Users.findOneAndUpdate(
            { _id: ObjectId(userId) },
            { $inc: { balance: 1.00 } }
        );

        await Bonus.create({
            userId: ObjectId(userId),
            type: 'daily',
            amount: 1.00,
            status: 'confirmed'
        });
    }
}

export const handleBet = async ({
    req = undefined,
    userId,
    amount,
    currency,
    type,
    info = '',
    status = false
}: {
    req?: any | undefined;
    userId: string;
    amount: number;
    currency: string;
    type: string;
    info: string;
    status?: boolean | undefined;
}) => {
    try {
        // Find and update user balance
        const currentUser = await Users.findOne({ _id: ObjectId(userId) });
        const newBalance = Math.round((currentUser.balance + NumberFix(amount, 5)) * 100000) / 100000;

        let user = await Users.findOneAndUpdate(
            { _id: ObjectId(userId) },
            { $set: { balance: newBalance } },
            { new: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        if (user.balance < 1) {
            giveDailyBonus(userId);
        }

        const currentBalance = NumberFix(user.balance, 5);

        if (user.bonusType && user.bonusType !== 'general' && user.balance < 1) {
            if (user.bonusType === 'wager') {
                user = await Users.findOneAndUpdate(
                    { _id: ObjectId(userId) },
                    { $set: { wagerBonus: 0 } },
                    { new: true }
                );
            } else {
                const bonusData = await Bonus.find(
                    { userId: ObjectId(userId), type: { $in: ['cashback', 'happyhour'] }, status: 'pending' }
                );

                await Bonus.updateMany(
                    { userId: ObjectId(userId), type: { $in: ['cashback', 'happyhour'] } },
                    { $set: { status: 'confirmed' } }
                );

                const totalAmount = bonusData.reduce((sum, item) => sum + item.amount, 0);

                const updatedUser = await Users.findOneAndUpdate(
                    { _id: ObjectId(userId) },
                    { $inc: { cashback: totalAmount } },
                    { new: true }
                );

                if (updatedUser.cashback >= 500) {
                    const luckyNumber = random(0, 49);
                    await Users.findOneAndUpdate(
                        { _id: ObjectId(userId) },
                        {
                            $inc: { cashback: -500 },
                            $push: { luckyNumber }
                        }
                    );
                }

                await balanceUpdate({
                    req,
                    userId,
                    amount: totalAmount,
                    type: 'In',
                    payuserId: bonusData[0]?.payuserId,
                    typeDetail: 'Bonus Rewards',
                    bonusType: 'general',
                    bonus: -totalAmount
                });

            }
        }

        if (user.bonusType === 'wager' && user.balance > user.wagerBonus * 7) {
            user = await Users.findOneAndUpdate(
                { _id: ObjectId(userId) },
                { $set: { bonus: 0, bonusType: 'general', wagerBonus: 0 } },
                { new: true }
            );

        }

        if (amount < 0) {
            const jackpot = await calculateJackpot(-amount);
            if (jackpot) {
                await Jackpothistories.create({
                    userId,
                    username: user.username,
                    parent: user.parent,
                    amount: jackpot.amount,
                    type: jackpot.type,
                });
                user = await Users.findOneAndUpdate(
                    { _id: ObjectId(userId) },
                    { $inc: { balance: jackpot.amount } },
                    { new: true }
                );
            }
        }

        // Emit socket event if session exists
        if (status && req) {
            const session = await Sessions.findOne({ userId: ObjectId(userId) });
            if (session?.socketId) {
                req.app.get('io').to(session.socketId).emit('balance', {
                    balance: currentBalance
                });
            }
        }

        return user;
    } catch (error) {
        console.error('Handle bet error:', error);
        throw error; // Re-throw to handle in caller
    }
};

export const toNumber = (number: number, fixed = 5) => {
    if (!number || isNaN(number)) {
        return 0;
    } else {
        return Number(Number(number).toFixed(fixed));
    }
};

export const balanceUpdate = async ({
    req,
    userId,
    amount,
    type,
    payuserId,
    typeDetail,
    bonus,
    bonusType
}: {
    req?: any | undefined;
    userId: string;
    amount: number;
    type: string;
    payuserId: string;
    typeDetail?: string;
    bonus?: number;
    bonusType?: string;
}) => {

    // Find and update user balance
    const result = await Users.findOneAndUpdate(
        { _id: ObjectId(userId) },
        {
            $inc: { balance: NumberFix(amount), bonus: bonus },
            ...(bonusType ? { $set: { bonusType: bonusType } } : {})
        },
        {
            new: true,
            populate: {
                path: 'permissionId',
                select: 'title',
                model: 'permissions'
            }
        }
    )
        .select('+password')
        .lean();

    // Transform result if user found
    if (result) {
        // Decrypt password and restructure permission data
        result.password = decrypt(result.password);
        result.permission = result.permissionId;
        delete result.permissionId;
    }
    const currentBalance = NumberFix(result.balance);
    const beforeBalance = NumberFix(result.balance - amount);
    const lastPayment = await Payments.findOne().sort({ id: -1 });
    const nextId = lastPayment ? lastPayment.id + 1 : 1;
    await Payments.create({
        id: nextId,
        userId,
        username: result.username,
        parent: result.parent,
        payuserId,
        amount,
        type,
        typeDetail,
        afterBalance: currentBalance,
        afterBonus: result.bonus,
        ip: getIPAddress(req).ip
    });

    if (typeDetail === 'deposit' || typeDetail === 'withdraw') {
        const payuser = await Users.findOneAndUpdate(
            { _id: ObjectId(payuserId), role: { $ne: 'admin' } },
            {
                $inc: {
                    balance: NumberFix(-amount),
                    [type === 'In' ? 'in' : 'out']: NumberFix(type === 'In' ? amount : -amount)
                },
            },
            { new: true }
        );
        if (payuser) {
            result.adminbalance = payuser.balance;
            result.adminin = payuser.in;
            result.adminout = payuser.out;
        }
    }
    if (result.status && !result.disabled && req) {
        const session = await Sessions.findOne({ userId: result._id });
        if (session && session.socketId) {
            req.app.get('io').to(session.socketId).emit('balance', { balance: result.balance });
            req.app.get('io').to(session.socketId).emit('bonus', { bonus: result.bonus });
        }
    }
    return result;
};


export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        const result = await transporter.sendMail({
            subject,
            from: process.env.USER,
            to,
            html
        });
        return true;
    } catch (error) {
        console.log('email not sent', error);
        return false;
    }
};

export const checkBalance = async ({ userId, amount }: { userId: string; amount: number }) => {
    const user = await Users.findOne({
        userId: ObjectId(userId),
    });
    if (amount > 0 && user?.balance && user.balance >= amount) {
        return true;
    } else {
        return false

    }
};

export const logErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
    next(err);
};

export const clientErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (req.xhr) {
        res.status(500).send({ error: 'Something failed!' });
    } else {
        next(err);
    }
};

export const generatInfo = (): string => {
    return String(Date.now() + Math.random());
};

export const random = (min: number, max: number, floor = true): number => {
    let r = Math.random() * max + min;

    return floor ? Math.floor(r) : r;
};

export const getUserBalance = async (userId: ObjectIdType) => {
    const user = await Users.findById(userId);
    return user?.balance;
};
