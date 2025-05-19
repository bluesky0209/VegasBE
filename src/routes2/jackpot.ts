import routerx from 'express-promise-router';
import { getJackpot, spinJackpot } from '../controllers/balances/jackpothistory';

const router = routerx();

router.post('/getJackpot', getJackpot);
router.post('/spinJackpot', spinJackpot);
export default router;
