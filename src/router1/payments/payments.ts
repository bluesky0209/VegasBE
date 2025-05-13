import routerx from 'express-promise-router';
import { V } from '../../middlewares/validation';
import { Validator } from '../../middlewares/validation';
import { deposit, withdraw } from '../../controllers/balances';
import { getShifts, list, paymentReport, paymentReportUser, paymentsList, resetPayments } from '../../controllers/balances/payments';
import { history } from '../../controllers/balances/cashierhistory';

const router = routerx();
router.post('/deposit', V.body(Validator.Users.Admin.Deposit), deposit);
router.post('/withdraw', V.body(Validator.Users.Admin.Withdraw), withdraw);
router.post('/list', list)
router.post('/history', history)
router.post('/report', paymentReport)
router.post('/report-user', paymentReportUser)
router.post('/payments-list', paymentsList)
router.post('/resetPayments', resetPayments)
router.post('/shifts', getShifts)
export default router;
