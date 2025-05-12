import routerx from 'express-promise-router';
import { V } from '../../middlewares/validation';
import { Validator } from '../../middlewares/validation';
import { deposit, withdraw } from '../../controllers/balances';
import { list } from '../../controllers/balances/payments';

const router = routerx();
router.post('/deposit', V.body(Validator.Users.Admin.Deposit), deposit);
router.post('/withdraw', V.body(Validator.Users.Admin.Withdraw), withdraw);
router.post('/list', list)
export default router;
