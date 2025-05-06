import { Schema, model } from 'mongoose';

const CasinoProvidersSchema = new Schema({
    Id: {
        type: String,
    },
    Name: {
        type: String,
    },
    status: {
        type: Boolean,
        default: true
    }
}
);

export const CasinoProviders = model('casino_providers', CasinoProvidersSchema);
