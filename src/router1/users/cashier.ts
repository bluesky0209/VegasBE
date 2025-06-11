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
    signout,
    changePassword,
    create,
    updateTimezone,
    generate
} from '../../controllers/users/cashier';
import { verifyCashierToken } from '../../middlewares/auth';
const router = routerx();

router.post('/signin', V.body(Validator.Users.Admin.Signin), signin);
router.post('/signout', verifyCashierToken, V.body(Validator.UserId), signout);
router.post('/changePassword', verifyCashierToken, V.body(Validator.Users.Admin.ChangePassword), changePassword);

router.get('/', verifyCashierToken, get);
router.get('/:id', verifyCashierToken, V.params(Validator.ObjectId), getOne);
router.post('/list', verifyCashierToken, V.body(Validator.Users.Admin.List), list);
router.post('/label', verifyCashierToken, label);
router.post('/addlabel', verifyCashierToken, addlabel);
router.put('/:id', verifyCashierToken, V.params(Validator.ObjectId), updateOne);
router.delete('/:id', verifyCashierToken, V.params(Validator.ObjectId), deleteOne);
router.post('/create', verifyCashierToken, V.body(Validator.Users.Admin.CreateUser), create);
router.post('/generate', verifyCashierToken, generate);
router.post('/updateTimezone', verifyCashierToken, updateTimezone);
export default router;
