import routerx from 'express-promise-router';
import { Validator, V } from '../../middlewares/validation';
import {
    deleteOne,
    get,
    getOne,
    list,
    updateOne,
    label,
    addlabel,
    signin,
    signup,
    signout,
    changePassword,
    createUser
} from '../../controllers/users/admin';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.post('/signin', V.body(Validator.Users.Admin.Signin), signin);
router.post('/signup', verifyAdminToken, V.body(Validator.Users.Admin.Signup), signup);
router.post('/signout', verifyAdminToken, V.body(Validator.UserId), signout);
router.post('/changePassword', verifyAdminToken, V.body(Validator.Users.Admin.ChangePassword), changePassword);

router.get('/', verifyAdminToken, get);
router.get('/:id', verifyAdminToken, V.params(Validator.ObjectId), getOne);
router.post('/list', verifyAdminToken, V.body(Validator.Users.Admin.List), list);
router.post('/label', verifyAdminToken, label);
router.post('/addlabel', verifyAdminToken, addlabel);
router.put('/:id', verifyAdminToken, V.params(Validator.ObjectId), updateOne);
router.delete('/:id', verifyAdminToken, V.params(Validator.ObjectId), deleteOne);
router.post('/create', verifyAdminToken, V.body(Validator.Users.Admin.CreateUser), createUser);

export default router;
