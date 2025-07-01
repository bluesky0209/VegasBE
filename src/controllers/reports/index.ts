import { Request, Response } from 'express';
import { Payments, Users } from '../../models';

export const reportProfit = async (req: Request, res: Response) => {
    try {
        const { superagent, agent, cashier, player, date } = req.body;
        const query: any = {};
        let username = "";

        if (superagent) {
            username = superagent;
            query['parent.superagent'] = superagent;
        }
        if (agent) {
            username = agent;
            query['parent.agent'] = agent
        }
        if (cashier) {
            username = cashier;
            query['parent.cashier'] = cashier
        }
        if (player) {
            username = player;
            query.username = player
        }

        if (date?.[0] && date?.[1]) {
            query.createdAt = {
                $gte: new Date(date[0]),
                $lte: new Date(date[1])
            };
        }

        console.log(query, "qier")

        const user = await Users.findOne({ username });

        const [deposits, withdrawals, balance] = await Promise.all([
            Payments.aggregate([
                {
                    $match: {
                        'parent.cashier': { $exists: true },
                        ...query,
                        type: 'In',
                        typeDetail: 'deposit',
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).then(result => result[0]?.total || 0),

            Payments.aggregate([
                {
                    $match: {
                        'parent.cashier': { $exists: true },
                        ...query,
                        type: 'Out',
                        typeDetail: 'withdraw',
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).then(result => result[0]?.total || 0),

            Users.aggregate([
                {
                    $match: {
                        ...query,
                        role: 'player'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$balance' }
                    }
                }
            ]).then(result => result[0]?.total || 0)
        ]);
        console.log(deposits, withdrawals, balance)
        const profit = deposits + withdrawals - balance;

        return res.json({
            username: user.username,
            role: user.role,
            balance,
            profit
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Server error' });
    }
}

export const reportProfitByRole = async (req: Request, res: Response) => {
    try {
        const { role, username, date } = req.body;
        let query: any = {};
        const roleMapping: any = {
            admin: 'superagent',
            superagent: {
                role: 'agent',
                parentField: 'parent.superagent'
            },
            agent: {
                role: 'cashier',
                parentField: 'parent.agent'
            }
        };

        const searchRole = roleMapping[role]?.role || roleMapping.admin;
        if (role !== 'admin') {
            query[roleMapping[role].parentField] = username;
        }

        console.log(query, "queryss")
        // Get users matching role criteria
        const users = await Users.aggregate([
            {
                $match: {
                    ...query,
                    role: searchRole
                }
            },
            {
                $project: {
                    _id: 0,
                    username: 1,
                    balance: 1
                }
            }
        ]);

        console.log(users, "users")
        const profitData = await Promise.all(users.map(async user => {
            const { username, balance } = user;

            const [deposits, withdrawals, playerBalance] = await Promise.all([
                Payments.aggregate([
                    {
                        $match: {
                            type: 'In',
                            typeDetail: 'deposit',
                            [`parent.${searchRole}`]: username,
                            'parent.cashier': { $exists: true },
                            createdAt: {
                                $gte: new Date(date[0]),
                                $lte: new Date(date[1])
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]).then(result => result[0]?.total || 0),

                Payments.aggregate([
                    {
                        $match: {
                            type: 'Out',
                            typeDetail: 'withdraw',
                            [`parent.${searchRole}`]: username,
                            'parent.cashier': { $exists: true },
                            createdAt: {
                                $gte: new Date(date[0]),
                                $lte: new Date(date[1])
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]).then(result => result[0]?.total || 0),

                Users.aggregate([
                    {
                        $match: {
                            [`parent.${searchRole}`]: username,
                            role: 'player'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$balance' }
                        }
                    }
                ]).then(result => result[0]?.total || 0)
            ]);

            // Calculate profit: deposits + withdrawals - player balances
            return {
                username,
                balance,
                role: searchRole,
                profit: deposits + withdrawals - playerBalance
            };
        }));

        return res.json(profitData);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Server error' });
    }
}
