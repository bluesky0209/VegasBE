import { Schema, model } from 'mongoose';

const CasinoBonusSchema = new Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String
    }
}, { timestamps: true })

export const CasinoBonus = model('bonus', CasinoBonusSchema);

