import { Schema, model } from 'mongoose';

const JackpotsSchema = new Schema(
    {
        gold: {
            type: Number,
            default: 100
        },
        silver: {
            type: Number,
            default: 50
        },
        bronze: {
            type: Number,
            default: 20
        },
        cashier: {
            type: String,
        }
    },
    { timestamps: true }
);

export const Jackpots = model('jackpots', JackpotsSchema);
