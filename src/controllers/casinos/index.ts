
import 'dotenv/config';
import 'regenerator-runtime';
import * as request from 'request';
import md5 = require("md5")
import { CasinoBetHistory, CasinoCategories, CasinoGameLists, CasinoProviders, Users } from '../../models';
import { Request, Response } from 'express';
import { CronJob } from 'cron';
import { getIPAddress } from '../base';
import moment = require('moment-timezone');

export const getCasinoGamesLists = async (req: Request, res: Response) => {
    const { id, pid, gname, page, pageSize, sort } = req.body;
    let query: any = { status: true }
    if (id) {
        query["detail.Categories"] = id;
    }
    if (pid && pid.length > 0) {
        query["detail.system"] = { $in: pid };
    }
    if (gname) {
        query["gameName"] = { $regex: new RegExp(gname, 'i') };
    }

    let result;
    const count = await CasinoGameLists.countDocuments(query);

    if (id === '4' || id === '35') {
        result = await CasinoGameLists.find(
            {
                "detail.system": '960',
                // $or: [
                //     { "detail.system": '960' },
                //     { "detail.Categories": id }
                // ],
                status: true
            }).sort({ "gameName": sort });
    } else {
        if (!page || !pageSize) {
            result = await CasinoGameLists.aggregate([
                {
                    $match: query,
                },
                {
                    $addFields: {
                        isSystem960: { $eq: ['$detail.system', '960'] },
                    },
                },
                {
                    $sort: {
                        isSystem960: -1,
                        gameName: sort
                    },
                },
            ]);

        } else {
            result = await CasinoGameLists.aggregate([
                {
                    $match: query,
                },
                {
                    $addFields: {
                        isSystem960: { $eq: ['$detail.system', '960'] },
                    },
                },
                {
                    $skip: (page - 1) * pageSize
                },
                {
                    $limit: pageSize
                },
                {
                    $sort: {
                        isSystem960: -1,
                        gameName: sort
                    },
                },
            ]);
        }
    }
    return res.json({ result, count });
}

export const getCasinoGamesListByCategory = async (req: Request, res: Response) => {
    const { id, gname, sort } = req.body;
    let result: any = {};
    for (let i = 0; i < id.length; i++) {
        if (id[i] === '4') {
            result[id[i]] = await CasinoGameLists.find(
                {
                    $and: [
                        { gameName: { $regex: '.*' + gname + '.*', $options: 'i' } },
                        {
                            "detail.system": '960'
                            // $or: [
                            //     { "detail.system": '960' },
                            //     { "detail.Categories": id[i] }
                            // ]
                        },
                        { status: true }
                    ]
                }).sort({ "gameName": sort });
        } else {
            result[id[i]] = await CasinoGameLists.find(
                {
                    $and: [
                        { gameName: { $regex: '.*' + gname + '.*', $options: 'i' } },
                        { "detail.Categories": id[i] },
                        { status: true }
                    ]
                }
            ).sort({ "gameName": sort })
        }
    }

    return res.json(result);
}

export const getCasinoProviders = async (req: Request, res: Response) => {
    let query = { Categories: req.body.id, Status: true }
    const result = await CasinoProviders.aggregate([
        {
            $match: query,
        },
        {
            $addFields: {
                isSystem960: { $eq: ['$System', '960'] },
            },
        },
        {
            $sort: {
                isSystem960: -1,
            },
        },
    ]);
    return res.json(result)
}

export const getCasinoGamesDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const result = await CasinoGameLists.findOne({ gameId: id, status: true });
        return res.json(result)
    } catch (e) {
        console.log(e)
    }
}   