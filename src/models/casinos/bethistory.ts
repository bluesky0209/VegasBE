import { Schema, model } from 'mongoose';

const CasinoBetHistorySchema = new Schema({
    gameId: {
        type: String,
        required: true,
    },
    gameName: {
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
    gameRoundRef: {
        type: String,
    },
    currency: {
        type: String,
        default: "USD"
    },
    spinDetails: {
        type: Object
    },
    win: {
        type: Number,
        default: 0
    },
    bet: {
        type: Number,
        default: 0
    },
    type: {
        type: String //bet and rollback
    },
    provider: {
        type: String
    }
}, { timestamps: true })

export const CasinoBetHistory = model('casino_bethistory', CasinoBetHistorySchema);

