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
import { Sessions, Users, BalanceHistories } from '../models';
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
        const user = await Users.findOneAndUpdate(
            { _id: ObjectId(userId) },
            { $set: { balance: newBalance } },
            { new: true }
        );

        if (!user) {
            throw new Error('User not found');
        }

        const currentBalance = NumberFix(user.balance, 5);
        const beforeBalance = NumberFix(currentBalance - amount, 5);

        // Create balance history record
        await BalanceHistories.create({
            userId,
            amount: NumberFix(amount, 5),
            currency,
            type,
            currentBalance,
            beforeBalance,
            info,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Emit socket event if session exists
        if (status && req) {
            const session = await Sessions.findOne({ userId });
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
