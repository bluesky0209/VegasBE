import { Schema, model } from 'mongoose';

const PaymentsSchema = new Schema(
    {
        userId: {
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
        }
    },
    { timestamps: true }
);

export const Payments = model('payments', PaymentsSchema);
