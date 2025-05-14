import { Schema, model } from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';
import { decrypt, encrypt } from '../../controllers/base';

const UsersSchema = new Schema(
    {
        id: {
            type: Number,
            unique: true
        },
        parentId: {
            type: Schema.Types.ObjectId,
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
        count: {
            superagent: {
                type: Number,
                default: 0
            },
            agent: {
                type: Number,
                default: 0
            },
            cashier: {
                type: Number,
                default: 0
            },
            player: {
                type: Number,
                default: 0
            }
        },
        role: {
            type: String,
            default: 'player'
        },
        email: {
            type: String,
        },
        password: {
            type: String,
            unique: false
        },
        username: {
            type: String,
            unique: true
        },
        name: {
            type: String
        },
        balance: {
            type: Number,
            default: 0
        },
        bonus: {
            type: Number,
            default: 0
        },
        wagerBonus: {
            type: Number,
            default: 0
        },
        bonusType: {
            type: String,
            default: 'general' //cashback,happyhour,wager
        },
        permissionId: {
            type: Schema.Types.ObjectId,
            ref: 'permissions'
        },
        game: {
            type: String,
            default: null
        },
        timezone: {
            type: String,
            default: 'America/Los_Angeles'
        },
        in: {
            type: Number,
            default: 0
        },
        out: {
            type: Number,
            default: 0
        },
        ip: {
            type: String
        },
        country: {
            type: String
        },
        iReferral: {
            type: String
        },
        rReferral: {
            type: String
        },
        referralRewards: {
            type: Number,
            default: 0
        },
        commissionRewards: {
            type: Number,
            default: 0
        },
        friends: {
            type: Number,
            default: 0
        },
        friendsRewards: {
            type: Number,
            default: 0
        },
        wager: {
            type: Number,
            default: 0
        },
        friendsWager: {
            type: Number,
            default: 0
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

UsersSchema.methods.generateHash = (password: string) => {
    // Using encrypt() from base.ts to allow decryption later
    // return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    return encrypt(password);
};

UsersSchema.methods.validPassword = (password: string, encrypted: string) => {
    // return bcrypt.compareSync(password, encrypted);
    return decrypt(encrypted) === password;
};

UsersSchema.pre('findOneAndUpdate', function () {
    this.populate('permissionId', ['title', 'order']);
});

UsersSchema.pre('findOne', function () {
    this.populate('permissionId', ['title', 'order']);
});

UsersSchema.pre('find', function () {
    this.populate('permissionId', ['title', 'order']);
});

UsersSchema.pre('findById', function () {
    this.populate('permissionId', ['title', 'order']);
});

UsersSchema.pre('findByIdAndUpdate', function () {
    this.populate('permissionId', ['title', 'order']);
});

export const Users = model('users', UsersSchema);
