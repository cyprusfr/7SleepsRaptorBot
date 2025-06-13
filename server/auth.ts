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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    // Get the first domain from REPLIT_DOMAINS
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    const domain = domains.length > 0 ? `https://${domains[0]}` : 'http://localhost:5000';
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
          isApproved: false,
          role: "pending",
          permissions: {},
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

  app.get('/api/auth/user', async (req, res) => {
    // Check Google OAuth authentication
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    
    // Check email authentication session
    const sessionUserId = (req.session as any).userId;
    const sessionAuthMethod = (req.session as any).authMethod;
    if (sessionUserId && sessionAuthMethod === 'email') {
      try {
        const user = await storage.getUser(sessionUserId);
        if (user && user.authMethod === 'email') {
          return res.json(user);
        }
      } catch (error) {
        console.error("Error fetching email auth user:", error);
      }
    }
    
    res.status(401).json({ error: 'Not authenticated' });
  });

  app.post('/api/auth/logout', (req, res) => {
    // Clear email authentication session
    if ((req.session as any).userId && (req.session as any).authMethod === 'email') {
      delete (req.session as any).userId;
      delete (req.session as any).authMethod;
      req.session.save(() => {
        res.json({ success: true });
      });
      return;
    }
    
    // Clear Google OAuth authentication
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