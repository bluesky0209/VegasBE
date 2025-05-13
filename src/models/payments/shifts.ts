import { Schema, model } from 'mongoose';

const ShiftsSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        cashier: {
            type: String,
            default: '0'
        },
        in: {
            type: Number,
            default: 0
        },
        out: {
            type: Number,
            default: 0
        },
        sum: {
            type: Number,
            default: 0
        }

    },
    { timestamps: true }
);

export const Shifts = model('shifts', ShiftsSchema);
