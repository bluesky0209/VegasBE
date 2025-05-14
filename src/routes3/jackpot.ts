import { getJackpot, getJackpotHistory } from "../controllers/balances/jackpothistory";
import routerx from 'express-promise-router';

const router = routerx();

router.post('/getJackpot', getJackpot);
router.post('/getJackpotHistory', getJackpotHistory);

export default router;
