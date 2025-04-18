import { Schema, model } from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';

const UsersSchema = new Schema(
    {
        email: {
            type: String,
            unique: true
        },
        password: {
            type: String,
            unique: false
        },
        username: {
            type: String,
            unique: true
        },
        bankGroup: {
            type: String
        },
        nick: {
            type: String
        },
        firstname: {
            type: String,
            default: ''
        },
        lastname: {
            type: String,
            default: ''
        },
        permissionId: {
            type: Schema.Types.ObjectId,
            ref: 'permissions'
        },
        avatar: {
            type: String,
            default: ''
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
        isVerify: {
            type: Boolean,
            default: false,
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

UsersSchema.methods.generateHash = (password: string) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

UsersSchema.methods.validPassword = (password: string, encrypted: string) => {
    return bcrypt.compareSync(password, encrypted);
};

UsersSchema.pre('findOneAndUpdate', function () {
    this.populate('permissionId', ['title']);
});

UsersSchema.pre('findOne', function () {
    this.populate('permissionId', ['title']);
});

UsersSchema.pre('find', function () {
    this.populate('permissionId', ['title']);
});

export const Users = model('users', UsersSchema);
