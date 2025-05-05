import routerx from 'express-promise-router';
import { Validator, V } from '../../middlewares/validation';
import {
    deleteOne,
    get,
    getOne,
    list,
    updateOne,
    label,
} from '../../controllers/users/admin';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.get('/', verifyAdminToken, get);
router.get('/:id', verifyAdminToken, V.params(Validator.ObjectId), getOne);
router.post('/list', verifyAdminToken, V.body(Validator.Users.Admin.List), list);
router.post('/label', verifyAdminToken, label);
router.put('/:id', verifyAdminToken, V.params(Validator.ObjectId), updateOne);
router.delete('/:id', verifyAdminToken, V.params(Validator.ObjectId), deleteOne);

export default router;
