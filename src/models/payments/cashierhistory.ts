import { Schema, model } from 'mongoose';

const CashierHistorySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        content: {
            type: String
        },
        type: {
            type: String
        }

    },
    { timestamps: true }
);

export const CashierHistory = model('cashierhistory', CashierHistorySchema);
