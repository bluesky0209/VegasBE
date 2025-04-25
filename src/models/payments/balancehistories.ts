import { Schema, model } from 'mongoose';

const BalanceHistoriesSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        currency: {
            type: String
        },
        amount: {
            type: Number,
            default: 0
        },
        currentBalance: {
            type: Number,
            default: 0
        },
        beforeBalance: {
            type: Number,
            default: 0
        },
        type: {
            type: String
        },
        info: {
            type: String
        },
        createdAt: {
            type: Date,
            required: true,
        },
        updatedAt: {
            type: Date,
            required: true,
        }
    }
);

export const BalanceHistories = model('balancehistories', BalanceHistoriesSchema);
