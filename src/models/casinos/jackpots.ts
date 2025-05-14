import { Schema, model } from 'mongoose';

const JackpotsSchema = new Schema(
    {
        gold: {
            type: Number,
            default: 5
        },
        silver: {
            type: Number,
            default: 3
        },
        bronze: {
            type: Number,
            default: 1
        },
        goldbet: {
            type: Number,
            default: 0
        },
        silverbet: {
            type: Number,
            default: 0
        },
        bronzebet: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Jackpots = model('jackpots', JackpotsSchema);
