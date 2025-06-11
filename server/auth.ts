import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express } from 'express';
import { storage } from './storage';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET || 'raptor-bot-secret-key';

export function setupAuth(app: Express) {
  // Trust proxy for HTTPS detection
  app.set('trust proxy', 1);
  
  // Session configuration
  const pgSession = connectPg(session);
  app.use(session({
    store: new pgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: 'sessions',
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Always use secure cookies on Replit
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    // Use the production domain if available, otherwise fall back to the dev domain
    const domain = process.env.REPL_SLUG 
      ? `https://raptor-bot.replit.app`
      : `https://${process.env.REPLIT_DOMAINS}`;
    const callbackURL = `${domain}/api/auth/google/callback`;
    
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Upsert user in database
        const user = await storage.upsertUser({
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        });
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Auth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}