import { Schema, model } from 'mongoose';

const PaymentsSchema = new Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
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
        payuserId: {
            type: Schema.Types.ObjectId,
            required: true,
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
        typeDetail: {
            type: String
        },
        afterBalance: {
            type: Number
        },
        afterBonus: {
            type: Number
        }
    },
    { timestamps: true }
);

export const Payments = model('payments', PaymentsSchema);
