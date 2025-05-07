import { Request, Response } from 'express';
import { Users } from '../../models';
import { balanceUpdate } from '../base';

export const deposit = async (req: Request, res: Response) => {
    const { userId, amount, payuserId } = req.body;
    const user = await Users.findById(userId);
    const payuser = await Users.findById(payuserId);
    if (payuser.role !== 'admin' && user.parent[payuser.role] !== payuser.username) {
        return res.status(400).json('You are not allowed to deposit to this user');
    }
    const result = await balanceUpdate({ req, userId, amount, type: 'In', payuserId, typeDetail: 'deposit' });
    return res.status(200).json(result);
};

export const withdraw = async (req: Request, res: Response) => {
    const { userId, amount, payuserId } = req.body;
    const user = await Users.findById(userId);
    const payuser = await Users.findById(payuserId);
    if (payuser.role !== 'admin' && user.parent[payuser.role] !== payuser.username) {
        return res.status(400).json('You are not allowed to withdraw from this user');
    }
    const result = await balanceUpdate({ req, userId, amount, type: 'Out', payuserId, typeDetail: 'withdraw' });
    return res.status(200).json(result);
};

