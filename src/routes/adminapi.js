import express from 'express';

import logger from '../core/logger';
import { RegUser } from '../data/sql';
import { getIPFromRequest } from '../utils/ip';
import { compareToHash } from '../utils/hash';
import { APISOCKET_KEY } from '../core/config';

const router = express.Router();

/*
 * Need APISOCKETKEY to access
 */
router.use(async (req, res, next) => {
  const { headers } = req;
  if (!headers.authorization
    || !APISOCKET_KEY
    || headers.authorization !== `Bearer ${APISOCKET_KEY}`) {
    const ip = getIPFromRequest(req);
    logger.warn(`API adminapi request from ${ip} rejected`);
    res.status(401);
    res.json({
      success: false,
      errors: ['No or invalid authorization header'],
    });
    return;
  }
  next();
});

router.use(express.json());

/*
 * check login credentials
 * useful for 3rd party login
 */
router.post('/checklogin', async (req, res) => {
  const errors = [];

  const { password } = req.body;
  if (!password) {
    errors.push('No password given');
  }

  const query = {
    attributes: [
      'id',
      'name',
      'email',
      'password',
      'verified',
    ],
  };
  let userString;
  if (req.body.name) {
    query.where = { name: req.body.name };
    userString = req.body.name;
  } else if (req.body.email) {
    query.where = { email: req.body.email };
    userString = req.body.email;
  } else if (req.body.id) {
    query.where = { id: req.body.id };
    userString = String(req.body.id);
  } else {
    errors.push('No name or email given');
  }

  if (errors.length) {
    res.status(400);
    res.json({
      success: false,
      errors,
    });
    return;
  }

  const reguser = await RegUser.findOne(query);
  if (!reguser) {
    res.json({
      success: false,
      errors: [`User ${userString} does not exist`],
    });
    return;
  }

  if (!compareToHash(password, reguser.password)) {
    logger.info(
      `ADMINAPI: User ${reguser.name} / ${reguser.id} entered wrong password`,
    );
    res.json({
      success: false,
      errors: [`Password wrong for user ${userString}`],
    });
    return;
  }

  logger.info(`ADMINAPI: User ${reguser.name} / ${reguser.id} got loged in`);
  res.json({
    success: true,
    userdata: {
      id: reguser.id,
      name: reguser.name,
      email: reguser.email,
      verified: !!reguser.verified,
    },
  });
});

/*
 * get user data
 */
router.post('/userdata', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    res.status(400);
    res.json({
      success: false,
      errors: ['No id given'],
    });
    return;
  }
  const reguser = await RegUser.findOne({
    where: {
      id,
    },
  });
  if (!reguser) {
    res.json({
      success: false,
      errors: ['No such user'],
    });
    return;
  }

  res.json({
    success: true,
    userdata: {
      id: reguser.id,
      name: reguser.name,
      email: reguser.email,
    },
  });
});

export default router;
