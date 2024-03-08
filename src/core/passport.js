/**
 * https://scotch.io/tutorials/easy-node-authentication-linking-all-accounts-together#toc-linking-accounts-together
 *
 */

import passport from 'passport';
import JsonStrategy from 'passport-json';
import GoogleStrategy from 'passport-google-oauth2';
import DiscordStrategy from 'passport-discord';
import FacebookStrategy from 'passport-facebook';
import RedditStrategy from 'passport-reddit/lib/passport-reddit/strategy';
import VkontakteStrategy from 'passport-vkontakte/lib/strategy';

import { sanitizeName } from '../utils/validation';
import logger from './logger';
import { RegUser } from '../data/sql';
import User, { regUserQueryInclude as include } from '../data/User';
import { auth } from './config';
import { compareToHash } from '../utils/hash';
import { getIPFromRequest } from '../utils/ip';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (req, id, done) => {
  const user = new User();
  try {
    await user.initialize(id, getIPFromRequest(req));
    done(null, user);
  } catch (err) {
    done(err, user);
  }
});

/**
 * Sign in locally
 */
passport.use(new JsonStrategy({
  usernameProp: 'nameoremail',
  passwordProp: 'password',
}, async (nameoremail, password, done) => {
  // Decide if email or name by the occurrence of @
  // this is why we don't allow @ in usernames
  // NOTE: could allow @ in the future by making an OR query,
  // but i guess nobody really cares.
  //  https://sequelize.org/master/manual/querying.html
  const query = (nameoremail.indexOf('@') !== -1)
    ? { email: nameoremail }
    : { name: nameoremail };
  const reguser = await RegUser.findOne({
    include,
    where: query,
  });
  if (!reguser) {
    done(new Error('Name or Email does not exist!'));
    return;
  }
  if (!compareToHash(password, reguser.password)) {
    done(new Error('Incorrect password!'));
    return;
  }
  const user = new User();
  await user.initialize(reguser.id, null, reguser);
  user.updateLogInTimestamp();
  done(null, user);
}));

/*
 * OAuth SignIns, mail based
 *
 */
async function oauthLogin(provider, email, name, discordid = null) {
  if (!email) {
    throw new Error('You don\'t have a mail set in your account.');
  }
  name = sanitizeName(name);
  let reguser = await RegUser.findOne({
    include,
    where: { email },
  });
  if (!reguser) {
    reguser = await RegUser.findOne({
      include,
      where: { name },
    });
    while (reguser) {
      // name is taken by someone else
      // eslint-disable-next-line max-len
      name = `${name.substring(0, 15)}-${Math.random().toString(36).substring(2, 10)}`;
      // eslint-disable-next-line no-await-in-loop
      reguser = await RegUser.findOne({
        include,
        where: { name },
      });
    }
    // eslint-disable-next-line max-len
    logger.info(`Create new user from ${provider} oauth login ${email} / ${name}`);
    reguser = await RegUser.create({
      email,
      name,
      verified: 1,
      discordid,
    });
  }
  if (!reguser.discordid && discordid) {
    reguser.update({ discordid });
  }
  const user = new User();
  await user.initialize(reguser.id, null, reguser);
  return user;
}

/**
 * Sign in with Facebook.
 */
passport.use(new FacebookStrategy({
  ...auth.facebook,
  callbackURL: '/api/auth/facebook/return',
  proxy: true,
  profileFields: ['displayName', 'email'],
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const { displayName: name, emails } = profile;
    const email = emails[0].value;
    const user = await oauthLogin('facebook', email, name);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

/**
 * Sign in with Discord.
 */
passport.use(new DiscordStrategy({
  ...auth.discord,
  callbackURL: '/api/auth/discord/return',
  proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id, email, username: name } = profile;
    if (!email) {
      throw new Error(
        // eslint-disable-next-line max-len
        'Sorry, you can not use discord login with an discord account that does not have email set.',
      );
    }
    const user = await oauthLogin('discord', email, name, id);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

/**
 * Sign in with Google.
 */
passport.use(new GoogleStrategy({
  ...auth.google,
  callbackURL: '/api/auth/google/return',
  proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { displayName: name, emails } = profile;
    const email = emails[0].value;
    const user = await oauthLogin('google', email, name);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

/*
 * Sign in with Reddit
 */
passport.use(new RedditStrategy({
  ...auth.reddit,
  callbackURL: '/api/auth/reddit/return',
  proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const redditid = profile.id;
    let name = sanitizeName(profile.name);
    // reddit needs an own login strategy based on its id,
    // because we can not access it's mail
    let reguser = await RegUser.findOne({
      include,
      where: { redditid },
    });
    if (!reguser) {
      reguser = await RegUser.findOne({
        include,
        where: { name },
      });
      while (reguser) {
        // name is taken by someone else
        // eslint-disable-next-line max-len
        name = `${name.substring(0, 15)}-${Math.random().toString(36).substring(2, 10)}`;
        // eslint-disable-next-line no-await-in-loop
        reguser = await RegUser.findOne({
          include,
          where: { name },
        });
      }
      // eslint-disable-next-line max-len
      logger.info(`Create new user from reddit oauth login ${name} / ${redditid}`);
      reguser = await RegUser.create({
        name,
        verified: 1,
        redditid,
      });
    }
    const user = new User();
    await user.initialize(reguser.id, null, reguser);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

/**
 * Sign in with Vkontakte
 */
passport.use(new VkontakteStrategy({
  ...auth.vk,
  callbackURL: '/api/auth/vk/return',
  proxy: true,
  scope: ['email'],
  profileFields: ['displayName', 'email'],
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    const { displayName: name } = profile;
    const { email } = params;
    if (!email) {
      throw new Error(
        // eslint-disable-next-line max-len
        'Sorry, you can not use vk login with an account that does not have a verified email set.',
      );
    }
    const user = await oauthLogin('vkontakte', email, name);
    done(null, user);
  } catch (err) {
    done(err);
  }
}));


export default passport;
