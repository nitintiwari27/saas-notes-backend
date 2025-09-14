const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

const User = require("../models/User");
const { comparePassword } = require("../utils/helpers");

// Local Strategy for login
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Find user by email and populate account and role
        const user = await User.findOne({
          email: email.toLowerCase(),
          isActive: true,
          isDeleted: false,
        })
          .populate("account")
          .populate("role");

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Check if account is active
        if (!user.account || !user.account.isActive || user.account.isDeleted) {
          return done(null, false, { message: "Account is inactive" });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        console.error("Local strategy error:", error);
        return done(error);
      }
    }
  )
);

// JWT Strategy for protected routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    },
    async (req, payload, done) => {
      try {
        const user = await User.findById(payload.userId)
          .populate("account")
          .populate("role");

        if (!user || !user.isActive || user.isDeleted) {
          return done(null, false);
        }

        // Check if token was issued before user's token invalidation date
        if (payload.iat * 1000 < user.tokensInvalidBefore.getTime()) {
          return done(null, false);
        }

        // Check if account is active
        if (!user.account || !user.account.isActive || user.account.isDeleted) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        console.error("JWT strategy error:", error);
        return done(error, false);
      }
    }
  )
);

// Serialize user for session (not needed for JWT, but required by passport)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).populate("account").populate("role");
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
