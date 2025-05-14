import routerx from 'express-promise-router';
import { getJackpot } from '../controllers/balances/jackpothistory';
import { checkUser, verifyToken } from '../middlewares/auth';

const router = routerx();

router.post('/getJackpot', verifyToken, checkUser, getJackpot);

export default router;
