import { Schema, model } from 'mongoose';

const JackpothistoriesSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        username: {
            type: String,
            ref: 'users'
        },
        parent: {
            superagent: {
                type: String,
                ref: 'users'
            },
            agent: {
                type: String,
                ref: 'users'
            },
            cashier: {
                type: String,
                ref: 'users'
            }
        },
        amount: {
            type: Number
        },
        currency: {
            type: String,
            default: 'USD'
        },
        type: {
            type: String
        },
    },
    { timestamps: true }
);

export const Jackpothistories = model('jackpothistories', JackpothistoriesSchema);
