import * as Joi from 'joi';
import * as Validation from 'express-joi-validation';
import { Request, Response, NextFunction } from 'express';

export const V = Validation.createValidator({ passError: true });

export const RetrunValidation = (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error && error.error && error.value && error.type) {
        return res.status(400).json(error.error.toString().replace('Error: ', ''));
    } else {
        return next(error);
    }
};

export const Validator = {
    ObjectId: Joi.object({
        id: Joi.string().min(24).max(24).required()
    }),
    UserId: Joi.object({
        userId: Joi.string().min(24).max(24).required()
    }),
    EventId: Joi.object({
        id: Joi.number().required()
    }),
    Users: {
        Auth: {
            Signin: Joi.object({
                email: Joi.string().min(1).max(30).required(),
                password: Joi.string().min(1).max(30).required(),
            }),
            Signup: Joi.object({
                email: Joi.string().email().required(),
                username: Joi.string().min(3).max(30).required(),
                password: Joi.string().min(4).max(30).required(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional()
            }),
            CheckAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required()
            }),
            SigninAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required(),
                signature: Joi.string().min(1).required()
            }),
            SignupAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional(),
                defaultCurrency: Joi.string().optional()
            }),
            Forgot: Joi.object({
                email: Joi.string().email().required(),
                recaptcha: Joi.string().min(1).required()
            }),
            ChangePassword: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                'Current Password': Joi.string().min(1).required(),
                Password: Joi.string().min(8).max(30).message('').required()
            }),
            PasswordReset: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                token: Joi.string().min(1).required(),
                password: Joi.string().min(8).max(30).required()
            }),
            Info: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                update: Joi.boolean().required(),
                _id: Joi.string().min(24).max(24).optional(),
                email: Joi.string().min(1).optional(),
                username: Joi.string().min(1).optional(),
                avatar: Joi.string().min(1).allow('', null).optional(),
                cryptoAccount: Joi.string().min(42).max(44).optional(),
                publicAddress: Joi.string().min(42).max(44).optional(),
                oddsformat: Joi.string().optional(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional()
            })
        },
        Admin: {
            Signin: Joi.object({
                username: Joi.string().max(30).required(),
                password: Joi.string().min(6).max(30).required()
            }),
            Signup: Joi.object({
                email: Joi.string().max(30).required(),
                username: Joi.string().min(6).max(30).required(),
                password: Joi.string().min(8).max(30).required()
            }),
            CreateUser: Joi.object({
                name: Joi.string().min(1).max(30).optional(),
                username: Joi.string().min(4).max(30).required(),
                password: Joi.string().min(4).max(30).required(),
                permissionId: Joi.string().min(24).max(24).required(),
                userId: Joi.string().min(24).max(24).required(),
                role: Joi.string().min(1).max(30).required(),
                balance: Joi.number().optional(),
                bonusType: Joi.string().min(1).max(30).optional()
            }),
            Deposit: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                amount: Joi.number().required(),
                payuserId: Joi.string().min(24).max(24).required(),
                bonusType: Joi.string().min(1).max(30).optional()
            }),
            Withdraw: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                amount: Joi.number().required(),
                payuserId: Joi.string().min(24).max(24).required(),
                bonusType: Joi.string().min(1).max(30).optional()
            }),
            ChangePassword: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                oldpass: Joi.string().min(4).max(30).required(),
                newpass: Joi.string().min(6).max(30).required()
            }),
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                country: Joi.string().min(2).max(2).optional(),
                status: Joi.boolean().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                permission: Joi.string().min(24).max(24).optional(),
                date: Joi.array().optional(),
                role: Joi.string().optional(),
                permissionId: Joi.string().min(24).max(24).optional(),
                parentId: Joi.string().min(24).max(24).optional(),
                playerId: Joi.string().min(24).max(24).optional(),
                search: Joi.string().allow('').optional()
            })
        },
        Permission: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                order: Joi.number().min(0).optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                order: Joi.number().min(0).optional(),
                title: Joi.string().min(1).max(30).optional()
            }),
            Create: Joi.object({
                order: Joi.number().min(0).required(),
                title: Joi.string().min(1).max(30).required()
            })
        },
        Session: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                date: Joi.array().optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                socketId: Joi.string().min(1).optional(),
                accessToken: Joi.string().min(1).required(),
                refreshToken: Joi.string().min(1).optional(),
                passwordToken: Joi.string().min(1).optional(),
                expiration: Joi.date().required(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                socketId: Joi.string().min(1).optional(),
                accessToken: Joi.string().min(1).optional(),
                refreshToken: Joi.string().min(1).optional(),
                passwordToken: Joi.string().min(1).optional(),
                expiration: Joi.date().optional(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            })
        },
        LoginHistory: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                country: Joi.string().min(2).max(2).optional(),
                date: Joi.array().optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                ip: Joi.string().min(1).required(),
                country: Joi.string().min(2).max(2).required(),
                range: Joi.object().required(),
                useragent: Joi.object().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            })
        }
    },
    Files: {
        DeleteURI: Joi.object({
            uri: Joi.string().min(1).optional()
        })
    },
    Games: {
        Providers: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                name: Joi.string().required(),
                symbol: Joi.string().required(),
                currency: Joi.string().required(),
                inputPercentage: Joi.number().required(),
                outputPercentage: Joi.number().required(),
                order: Joi.number().required(),
                status: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                Name: Joi.string().optional(),
                System: Joi.string().optional(),
                Categories: Joi.array().optional(),
                order: Joi.number().optional(),
                Status: Joi.boolean().optional()
            })
        },
        Lists: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                providerId: Joi.string().min(0)
            }),
            Create: Joi.object({
                id: Joi.string().required(),
                name: Joi.string().required(),
                type: Joi.string().required(),
                icon: Joi.string().required(),
                providerId: Joi.string().min(24).max(24).required(),
                overlay: Joi.string().allow('').optional(),
                img: Joi.string().allow('').optional(),
                order: Joi.number().required(),
                rtp: Joi.number().required(),
                status: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                id: Joi.string().optional(),
                name: Joi.string().optional(),
                type: Joi.string().optional(),
                icon: Joi.string().optional(),
                providerId: Joi.string().min(24).max(24).optional(),
                overlay: Joi.string().allow('').optional(),
                img: Joi.string().allow('').optional(),
                order: Joi.number().optional(),
                rtp: Joi.number().optional(),
                status: Joi.boolean().optional()
            })
        },
        Games: {
            List: Joi.object({
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(3).max(24).optional(),
                gameName: Joi.string().min(0).max(15).optional(),
                provider: Joi.string().min(1).max(24).optional(),
                status: Joi.string().valid('BET', 'WIN').optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                filter: Joi.string().min(0).optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                providerId: Joi.string().min(24).max(24).required(),
                gameId: Joi.string().min(24).max(24).required(),
                odds: Joi.number().required(),
                amount: Joi.number().required(),
                profit: Joi.number().required(),
                betting: Joi.any().required(),
                aBetting: Joi.any().required(),
                status: Joi.string().valid('BET', 'DRAW', 'LOST', 'WIN').required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                providerId: Joi.string().min(24).max(24).optional(),
                gameId: Joi.string().min(24).max(24).optional(),
                odds: Joi.number().optional(),
                amount: Joi.number().optional(),
                profit: Joi.number().optional(),
                betting: Joi.any().optional(),
                aBetting: Joi.any().optional(),
                status: Joi.string().valid('BET', 'DRAW', 'LOST', 'WIN').optional()
            })
        }
    },
};
