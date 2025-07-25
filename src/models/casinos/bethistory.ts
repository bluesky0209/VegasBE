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
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    amount: {
        type: Number,
        default: 0
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
    realWin: {
        type: Number,
        default: 0
    },
    realBet: {
        type: Number,
        default: 0
    },
    bonusWin: {
        type: Number,
        default: 0
    },
    bonusBet: {
        type: Number,
        default: 0
    },
    type: {
        type: String //bet and rollback
    },
    provider: {
        type: String
    },
    aggregator: {
        type: String
    }
}, { timestamps: true })

export const CasinoBetHistory = model('casino_bethistory', CasinoBetHistorySchema);