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
import { verifyCashierToken } from '../../middlewares/auth';
const router = routerx();

router.get('/', verifyCashierToken, get);
router.get('/:id', verifyCashierToken, V.params(Validator.ObjectId), getOne);
router.post('/list', verifyCashierToken, V.body(Validator.Users.Admin.List), list);
router.post('/label', verifyCashierToken, label);
router.put('/:id', verifyCashierToken, V.params(Validator.ObjectId), updateOne);
router.delete('/:id', verifyCashierToken, V.params(Validator.ObjectId), deleteOne);

export default router;
