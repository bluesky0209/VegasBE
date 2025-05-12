import { Request, Response } from 'express';
import { CashierHistory } from '../../models';

export const history = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const history = await CashierHistory.find({ userId }).sort({ createdAt: -1 }).limit(20);
    return res.json(history);
};

