import { Schema, model } from 'mongoose';

const CasinoBankGroupSchema = new Schema({
    group: {
        type: String,
        required: true
    },
    id: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "USD"
    }
}, { timestamps: true })

export const CasinoBankGroup = model('bank_group', CasinoBankGroupSchema);

