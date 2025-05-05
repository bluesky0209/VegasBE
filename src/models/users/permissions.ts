import { Schema, model } from 'mongoose';

const PermissionsSchema = new Schema(
    {
        title: { //name
            type: String,
            required: true
        },
        order: { //level
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Permissions = model('permissions', PermissionsSchema);
