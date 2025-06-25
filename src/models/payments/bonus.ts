import { Schema, model } from 'mongoose';

const BonusSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        payuserId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
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
        status: {
            type: String,
            default: 'pending' //cancel, confirmed, pending
        }
    },
    { timestamps: true }
);

export const Bonus = model('bonus', BonusSchema);
