import { Schema, model } from 'mongoose';

const CasinoGameListsSchema = new Schema({
    Id: {
        type: String,
    },
    Name: {
        type: String,
    },
    Description: {
        type: String,
    },
    SectionId: {
        type: String,
        index: true
    },
    Type: {
        type: String,
    },
    Tags: {
        type: [String]
    },
    Format: {
        type: String
    },
    Settings: {
        type: Object
    },
    LinesCount: {
        type: String
    },
    BaseBet: {
        type: Number
    },
    MaxMultiplier: {
        type: Number
    },
    Icon: {
        type: String
    },
    aggregator: {
        type: String //c2gaming, skyxspin
    },
    status: {
        type: Boolean,
        default: true
    }
}
);

export const CasinoGameLists = model('casino_gamelist', CasinoGameListsSchema);
