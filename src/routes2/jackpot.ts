import routerx from 'express-promise-router';
import { getJackpot, getJackpotNumber, spinJackpot } from '../controllers/balances/jackpothistory';

const router = routerx();

router.post('/getJackpot', getJackpot);
router.post('/getJackpotNumber', getJackpotNumber);
router.post('/spinJackpot', spinJackpot);
export default router;
