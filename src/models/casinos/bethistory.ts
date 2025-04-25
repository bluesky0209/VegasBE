import { Schema, model } from 'mongoose';

const CasinoBetHistorySchema = new Schema({
    gameId: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    amount: {
        type: Number,
        required: true
    },
    transactionRef: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        default: "USD"
    },
    spinDetails: {
        type: Object
    },
    type: {
        type: String //bet and rollback
    },
    provider: {
        type: String
    }
}, { timestamps: true })

export const CasinoBetHistory = model('casino_bethistory', CasinoBetHistorySchema);

