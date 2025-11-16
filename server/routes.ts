import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, loginSchema, depositSchema, betSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "crypto-bet-secret-key-change-in-production";

interface AuthRequest extends Request {
  userId?: string;
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Helper to generate wallet address
const generateWalletAddress = (userId: string): string => {
  // Generate a mock wallet address based on user ID
  const hash = Buffer.from(userId).toString('hex');
  return `0x${hash.substring(0, 40).padEnd(40, '0')}`;
};

// Helper to simulate coin flip
const simulateCoinFlip = (): 'heads' | 'tails' => {
  return Math.random() < 0.5 ? 'heads' : 'tails';
};

// Roulette helpers
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const spinRouletteWheel = (): number => {
  return Math.floor(Math.random() * 37); // 0-36
};

const isRedNumber = (num: number): boolean => {
  return RED_NUMBERS.includes(num);
};

const isBlackNumber = (num: number): boolean => {
  return BLACK_NUMBERS.includes(num);
};

const checkRouletteWin = (betChoice: string, result: number): boolean => {
  const num = result;
  
  if (betChoice === 'red') {
    return isRedNumber(num);
  } else if (betChoice === 'black') {
    return isBlackNumber(num);
  } else if (betChoice === 'even') {
    return num !== 0 && num % 2 === 0;
  } else if (betChoice === 'odd') {
    return num !== 0 && num % 2 === 1;
  } else {
    // Specific number bet
    return parseInt(betChoice) === num;
  }
};

const calculateRoulettePayout = (betChoice: string, betAmount: number): number => {
  // Specific number pays 35:1 (35x + original bet = 36x total)
  if (!isNaN(parseInt(betChoice))) {
    return betAmount * 36;
  }
  // Red/Black/Odd/Even pays 1:1 (1x + original bet = 2x total)
  return betAmount * 2;
};

// Tower game helpers
interface TowerGame {
  userId: string;
  betAmount: number;
  currentLevel: number;
  currentMultiplier: number;
  isActive: boolean;
}

const towerGames = new Map<string, TowerGame>();

const TOWER_DIFFICULTIES = {
  easy: { winChance: 0.66, multiplier: 1.5 },
  medium: { winChance: 0.50, multiplier: 2.0 },
  hard: { winChance: 0.33, multiplier: 3.0 },
};

const MAX_TOWER_LEVEL = 8;

// Tower game validation schemas
const towerStartSchema = z.object({
  betAmount: z.preprocess((val) => {
    // Convert to string for validation
    if (typeof val === 'number') {
      if (!isFinite(val) || val <= 0 || val > 1000000) {
        return null; // Will fail validation
      }
      return val.toString();
    }
    return val;
  }, z.string().regex(/^\d+(\.\d{1,8})?$/, { 
    message: 'Bet amount must be a valid decimal number' 
  }).transform(val => Number(val)).refine(val => val > 0 && val <= 1000000, {
    message: 'Bet amount must be between 0 and 1,000,000'
  })),
});

const towerPlaySchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' }),
  }),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Generate wallet address
      const walletAddress = generateWalletAddress(validatedData.email);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        walletAddress,
      });

      // Create initial balance
      await storage.createBalance({
        id: '',
        userId: user.id,
        amount: "0",
        currency: "USDT",
      });

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get wallet address
  app.get("/api/wallet-address", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ address: user.walletAddress });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get balance
  app.get("/api/balance", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      let balance = await storage.getBalance(req.userId!);
      if (!balance) {
        // Create initial balance if it doesn't exist
        balance = await storage.createBalance({ userId: req.userId!, amount: '0', currency: 'USDT' });
      }

      res.json({ amount: balance.amount, currency: balance.currency });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create deposit
  app.post("/api/deposit", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = depositSchema.parse(req.body);
      const user = await storage.getUser(req.userId!);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create deposit
      const deposit = await storage.createDeposit({
        userId: req.userId!,
        amount: validatedData.amount,
        currency: validatedData.currency,
        walletAddress: user.walletAddress,
      });

      // Simulate deposit confirmation after 2 seconds (in real app, this would be a webhook)
      setTimeout(async () => {
        const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        await storage.updateDepositStatus(deposit.id, 'confirmed', txHash);
        
        // Update balance
        const currentBalance = await storage.getBalance(req.userId!);
        const newAmount = (parseFloat(currentBalance?.amount || '0') + parseFloat(validatedData.amount)).toString();
        await storage.updateBalance(req.userId!, newAmount);

        // Create transaction record
        await storage.createTransaction({
          userId: req.userId!,
          type: 'deposit',
          amount: validatedData.amount,
          description: `Deposit of ${validatedData.amount} ${validatedData.currency}`,
        });
      }, 2000);

      res.status(201).json(deposit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get deposits
  app.get("/api/deposits", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const deposits = await storage.getDeposits(req.userId!);
      res.json(deposits);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Place bet
  app.post("/api/bet", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = betSchema.parse(req.body);
      
      // Check balance
      const balance = await storage.getBalance(req.userId!);
      if (!balance || parseFloat(balance.amount) < parseFloat(validatedData.betAmount)) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      let result: string;
      let outcome: 'win' | 'loss';
      let payout: string;
      let gameName: string;

      if (validatedData.gameType === 'roulette') {
        // Roulette game logic
        const wheelResult = spinRouletteWheel();
        result = wheelResult.toString();
        const isWin = checkRouletteWin(validatedData.betChoice, wheelResult);
        outcome = isWin ? 'win' : 'loss';
        payout = isWin ? calculateRoulettePayout(validatedData.betChoice, parseFloat(validatedData.betAmount)).toString() : '0';
        gameName = 'roulette';
      } else {
        // Coin flip game logic
        const flipResult = simulateCoinFlip();
        result = flipResult;
        outcome = flipResult === validatedData.betChoice ? 'win' : 'loss';
        payout = outcome === 'win' ? (parseFloat(validatedData.betAmount) * 2).toString() : '0';
        gameName = 'coin flip';
      }

      // Create bet record
      const bet = await storage.createBet({
        userId: req.userId!,
        gameType: validatedData.gameType,
        betAmount: validatedData.betAmount,
        betChoice: validatedData.betChoice,
        result,
        outcome,
        payout,
      });

      // Update balance
      const currentBalance = parseFloat(balance.amount);
      const betAmount = parseFloat(validatedData.betAmount);
      const payoutAmount = parseFloat(payout);
      const newBalance = outcome === 'win' 
        ? (currentBalance - betAmount + payoutAmount).toString() // Win: subtract bet, add payout
        : (currentBalance - betAmount).toString(); // Loss: lose bet amount

      await storage.updateBalance(req.userId!, newBalance);

      // Create transaction records
      await storage.createTransaction({
        userId: req.userId!,
        type: 'bet',
        amount: validatedData.betAmount,
        description: `Bet ${validatedData.betAmount} USDT on ${validatedData.betChoice}`,
      });

      if (outcome === 'win') {
        await storage.createTransaction({
          userId: req.userId!,
          type: 'win',
          amount: payout,
          description: `Won ${payout} USDT on ${gameName}`,
        });
      }

      res.json({ result, outcome, payout });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get recent bets
  app.get("/api/bets/recent", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const bets = await storage.getRecentBets(req.userId!, limit);
      res.json(bets);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get transactions
  app.get("/api/transactions", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const transactions = await storage.getTransactions(req.userId!);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get stats
  app.get("/api/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const balance = await storage.getBalance(req.userId!);
      const transactions = await storage.getTransactions(req.userId!);
      const bets = await storage.getBets(req.userId!);

      const totalDeposits = transactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      const totalWinnings = transactions
        .filter(tx => tx.type === 'win')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      res.json({
        balance: balance?.amount || '0',
        totalDeposits: totalDeposits.toString(),
        totalBets: bets.length,
        totalWinnings: totalWinnings.toString(),
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Tower game endpoints
  // Start tower game
  app.post("/api/tower/start", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = towerStartSchema.parse(req.body);
      const betAmount = validatedData.betAmount;

      // Check balance
      const balance = await storage.getBalance(req.userId!);
      if (!balance || parseFloat(balance.amount) < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // End any existing game
      if (towerGames.has(req.userId!)) {
        towerGames.delete(req.userId!);
      }

      // Deduct bet amount from balance
      const newBalance = (parseFloat(balance.amount) - betAmount).toString();
      await storage.updateBalance(req.userId!, newBalance);

      // Create transaction
      await storage.createTransaction({
        userId: req.userId!,
        type: 'bet',
        amount: betAmount.toString(),
        description: `Started tower game with ${betAmount.toFixed(2)} USDT`,
      });

      // Create new game
      const game: TowerGame = {
        userId: req.userId!,
        betAmount: betAmount,
        currentLevel: 0,
        currentMultiplier: 1,
        isActive: true,
      };
      towerGames.set(req.userId!, game);

      res.json({
        currentLevel: game.currentLevel,
        currentMultiplier: game.currentMultiplier,
        potentialPayout: game.betAmount * game.currentMultiplier,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Play tower level
  app.post("/api/tower/play", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = towerPlaySchema.parse(req.body);
      const difficulty = validatedData.difficulty;

      const game = towerGames.get(req.userId!);
      if (!game || !game.isActive) {
        return res.status(400).json({ message: 'No active game found' });
      }

      if (game.currentLevel >= MAX_TOWER_LEVEL) {
        return res.status(400).json({ message: 'Maximum level reached' });
      }

      const difficultyConfig = TOWER_DIFFICULTIES[difficulty as keyof typeof TOWER_DIFFICULTIES];
      const won = Math.random() < difficultyConfig.winChance;

      if (won) {
        // Player won this level
        game.currentLevel += 1;
        game.currentMultiplier *= difficultyConfig.multiplier;
        
        const potentialPayout = game.betAmount * game.currentMultiplier;

        res.json({
          outcome: 'win',
          currentLevel: game.currentLevel,
          currentMultiplier: game.currentMultiplier,
          potentialPayout,
          maxLevel: game.currentLevel >= MAX_TOWER_LEVEL,
        });
      } else {
        // Player lost
        game.isActive = false;
        towerGames.delete(req.userId!);

        // Create bet record
        await storage.createBet({
          userId: req.userId!,
          gameType: 'tower',
          betAmount: game.betAmount.toString(),
          betChoice: `Level ${game.currentLevel + 1} - ${difficulty}`,
          result: `Lost at level ${game.currentLevel + 1}`,
          outcome: 'loss',
          payout: '0',
        });

        res.json({
          outcome: 'loss',
          currentLevel: game.currentLevel,
          lostAmount: game.betAmount,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cash out tower game
  app.post("/api/tower/cashout", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = towerGames.get(req.userId!);
      if (!game || !game.isActive) {
        return res.status(400).json({ message: 'No active game found' });
      }

      // Create snapshot of game state and immediately remove from map to prevent race conditions
      const gameSnapshot = {
        betAmount: game.betAmount,
        currentLevel: game.currentLevel,
        currentMultiplier: game.currentMultiplier,
      };
      towerGames.delete(req.userId!);

      const payout = gameSnapshot.betAmount * gameSnapshot.currentMultiplier;
      
      // Update balance
      const balance = await storage.getBalance(req.userId!);
      const newBalance = (parseFloat(balance?.amount || '0') + payout).toString();
      await storage.updateBalance(req.userId!, newBalance);

      // Create bet record
      await storage.createBet({
        userId: req.userId!,
        gameType: 'tower',
        betAmount: gameSnapshot.betAmount.toString(),
        betChoice: `Cashed out at level ${gameSnapshot.currentLevel}`,
        result: `Level ${gameSnapshot.currentLevel}`,
        outcome: 'win',
        payout: payout.toString(),
      });

      // Create win transaction
      await storage.createTransaction({
        userId: req.userId!,
        type: 'win',
        amount: payout.toString(),
        description: `Won ${payout.toFixed(2)} USDT on tower (Level ${gameSnapshot.currentLevel})`,
      });

      res.json({
        payout,
        level: gameSnapshot.currentLevel,
        multiplier: gameSnapshot.currentMultiplier,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get tower game status
  app.get("/api/tower/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = towerGames.get(req.userId!);
      
      if (!game || !game.isActive) {
        return res.json({ hasActiveGame: false });
      }

      res.json({
        hasActiveGame: true,
        currentLevel: game.currentLevel,
        currentMultiplier: game.currentMultiplier,
        potentialPayout: game.betAmount * game.currentMultiplier,
        betAmount: game.betAmount,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ============================================================================
  // CRASH GAME
  // ============================================================================
  
  interface CrashGame {
    betAmount: number;
    startTime: number;
    crashPoint: number;
    isActive: boolean;
    cashedOut: boolean;
    cashoutMultiplier?: number;
  }

  const crashGames = new Map<string, CrashGame>();

  const crashStartSchema = z.object({
    betAmount: z.preprocess((val) => {
      if (typeof val === 'number') {
        if (!isFinite(val) || val <= 0 || val > 1000000) {
          return null;
        }
        return val.toString();
      }
      return val;
    }, z.string().regex(/^\d+(\.\d{1,8})?$/, { 
      message: 'Bet amount must be a valid decimal number' 
    }).transform(val => Number(val)).refine(val => val > 0 && val <= 1000000, {
      message: 'Bet amount must be between 0 and 1,000,000'
    })),
  });

  // Start crash game
  app.post("/api/crash/start", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const existingGame = crashGames.get(req.userId!);
      if (existingGame && existingGame.isActive) {
        return res.status(400).json({ message: 'You already have an active crash game' });
      }

      const { betAmount } = crashStartSchema.parse(req.body);

      const balance = await storage.getBalance(req.userId!);
      const currentBalance = parseFloat(balance?.amount || '0');

      if (currentBalance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const newBalance = (currentBalance - betAmount).toString();
      await storage.updateBalance(req.userId!, newBalance);

      await storage.createTransaction({
        userId: req.userId!,
        type: 'bet',
        amount: betAmount.toString(),
        description: `Placed ${betAmount.toFixed(2)} USDT bet on crash`,
      });

      const crashPoint = Math.max(1.01, Math.pow(Math.random(), -0.04));

      const game: CrashGame = {
        betAmount,
        startTime: Date.now(),
        crashPoint: Math.min(crashPoint, 1000),
        isActive: true,
        cashedOut: false,
      };

      crashGames.set(req.userId!, game);

      res.json({
        startTime: game.startTime,
        betAmount: game.betAmount,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cash out crash game
  app.post("/api/crash/cashout", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = crashGames.get(req.userId!);
      if (!game || !game.isActive) {
        return res.status(400).json({ message: 'No active crash game found' });
      }

      if (game.cashedOut) {
        return res.status(400).json({ message: 'Already cashed out' });
      }

      const gameSnapshot = {
        betAmount: game.betAmount,
        startTime: game.startTime,
        crashPoint: game.crashPoint,
      };
      crashGames.delete(req.userId!);

      const elapsed = (Date.now() - gameSnapshot.startTime) / 1000;
      const currentMultiplier = Math.min(1 + elapsed * 0.1, gameSnapshot.crashPoint);

      if (currentMultiplier >= gameSnapshot.crashPoint) {
        await storage.createBet({
          userId: req.userId!,
          gameType: 'crash',
          betAmount: gameSnapshot.betAmount.toString(),
          betChoice: 'Cashout',
          result: `Crashed at ${gameSnapshot.crashPoint.toFixed(2)}x`,
          outcome: 'loss',
          payout: '0',
        });

        return res.json({
          crashed: true,
          crashPoint: gameSnapshot.crashPoint,
          payout: 0,
        });
      }

      const payout = gameSnapshot.betAmount * currentMultiplier;

      const balance = await storage.getBalance(req.userId!);
      const newBalance = (parseFloat(balance?.amount || '0') + payout).toString();
      await storage.updateBalance(req.userId!, newBalance);

      await storage.createBet({
        userId: req.userId!,
        gameType: 'crash',
        betAmount: gameSnapshot.betAmount.toString(),
        betChoice: `Cashed out at ${currentMultiplier.toFixed(2)}x`,
        result: `${currentMultiplier.toFixed(2)}x`,
        outcome: 'win',
        payout: payout.toString(),
      });

      await storage.createTransaction({
        userId: req.userId!,
        type: 'win',
        amount: payout.toString(),
        description: `Won ${payout.toFixed(2)} USDT on crash (${currentMultiplier.toFixed(2)}x)`,
      });

      res.json({
        crashed: false,
        multiplier: currentMultiplier,
        payout,
        crashPoint: gameSnapshot.crashPoint,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get crash game status
  app.get("/api/crash/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = crashGames.get(req.userId!);
      
      if (!game || !game.isActive) {
        return res.json({ hasActiveGame: false });
      }

      const elapsed = (Date.now() - game.startTime) / 1000;
      const currentMultiplier = 1 + elapsed * 0.1;

      if (currentMultiplier >= game.crashPoint) {
        game.isActive = false;
        crashGames.delete(req.userId!);

        await storage.createBet({
          userId: req.userId!,
          gameType: 'crash',
          betAmount: game.betAmount.toString(),
          betChoice: 'Auto-crashed',
          result: `Crashed at ${game.crashPoint.toFixed(2)}x`,
          outcome: 'loss',
          payout: '0',
        });

        return res.json({
          hasActiveGame: false,
          crashed: true,
          crashPoint: game.crashPoint,
        });
      }

      res.json({
        hasActiveGame: true,
        currentMultiplier,
        betAmount: game.betAmount,
        potentialPayout: game.betAmount * currentMultiplier,
        startTime: game.startTime,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ============================================================================
  // DICE GAME
  // ============================================================================

  const dicePlaySchema = z.object({
    betAmount: z.preprocess((val) => {
      if (typeof val === 'number') {
        if (!isFinite(val) || val <= 0 || val > 1000000) {
          return null;
        }
        return val.toString();
      }
      return val;
    }, z.string().regex(/^\d+(\.\d{1,8})?$/, { 
      message: 'Bet amount must be a valid decimal number' 
    }).transform(val => Number(val)).refine(val => val > 0 && val <= 1000000, {
      message: 'Bet amount must be between 0 and 1,000,000'
    })),
    target: z.number().min(1).max(99),
    direction: z.enum(['over', 'under']),
  }).refine((data) => {
    if (data.direction === 'over' && data.target >= 99) {
      return false;
    }
    if (data.direction === 'under' && data.target <= 1) {
      return false;
    }
    return true;
  }, {
    message: 'Invalid target and direction combination. Roll over must be ≤98, roll under must be ≥2',
  });

  app.post("/api/dice/play", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { betAmount, target, direction } = dicePlaySchema.parse(req.body);

      const balance = await storage.getBalance(req.userId!);
      const currentBalance = parseFloat(balance?.amount || '0');

      if (currentBalance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const newBalance = (currentBalance - betAmount).toString();
      await storage.updateBalance(req.userId!, newBalance);

      await storage.createTransaction({
        userId: req.userId!,
        type: 'bet',
        amount: betAmount.toString(),
        description: `Placed ${betAmount.toFixed(2)} USDT bet on dice`,
      });

      const roll = Math.floor(Math.random() * 100);
      let win = false;

      if (direction === 'over') {
        win = roll > target;
      } else {
        win = roll < target;
      }

      let payout = 0;
      if (win) {
        const winChance = direction === 'over' ? (99 - target) / 100 : target / 100;
        const multiplier = 0.98 / winChance;
        payout = betAmount * multiplier;

        const balanceAfterWin = parseFloat(newBalance) + payout;
        await storage.updateBalance(req.userId!, balanceAfterWin.toString());

        await storage.createTransaction({
          userId: req.userId!,
          type: 'win',
          amount: payout.toString(),
          description: `Won ${payout.toFixed(2)} USDT on dice (${multiplier.toFixed(2)}x)`,
        });
      }

      await storage.createBet({
        userId: req.userId!,
        gameType: 'dice',
        betAmount: betAmount.toString(),
        betChoice: `${direction} ${target}`,
        result: roll.toString(),
        outcome: win ? 'win' : 'loss',
        payout: payout.toString(),
      });

      res.json({
        roll,
        win,
        payout,
        target,
        direction,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ============================================================================
  // MINES GAME
  // ============================================================================

  interface MinesGame {
    betAmount: number;
    mineCount: number;
    gridSize: number;
    minePositions: number[];
    revealedTiles: number[];
    isActive: boolean;
    currentMultiplier: number;
  }

  const minesGames = new Map<string, MinesGame>();

  const minesStartSchema = z.object({
    betAmount: z.preprocess((val) => {
      if (typeof val === 'number') {
        if (!isFinite(val) || val <= 0 || val > 1000000) {
          return null;
        }
        return val.toString();
      }
      return val;
    }, z.string().regex(/^\d+(\.\d{1,8})?$/, { 
      message: 'Bet amount must be a valid decimal number' 
    }).transform(val => Number(val)).refine(val => val > 0 && val <= 1000000, {
      message: 'Bet amount must be between 0 and 1,000,000'
    })),
    mineCount: z.number().min(1).max(24),
  });

  const minesRevealSchema = z.object({
    tileIndex: z.number().min(0).max(24),
  });

  // Start mines game
  app.post("/api/mines/start", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const existingGame = minesGames.get(req.userId!);
      if (existingGame && existingGame.isActive) {
        return res.status(400).json({ message: 'You already have an active mines game' });
      }

      const { betAmount, mineCount } = minesStartSchema.parse(req.body);

      const balance = await storage.getBalance(req.userId!);
      const currentBalance = parseFloat(balance?.amount || '0');

      if (currentBalance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const newBalance = (currentBalance - betAmount).toString();
      await storage.updateBalance(req.userId!, newBalance);

      await storage.createTransaction({
        userId: req.userId!,
        type: 'bet',
        amount: betAmount.toString(),
        description: `Placed ${betAmount.toFixed(2)} USDT bet on mines`,
      });

      const gridSize = 25;
      const minePositions: number[] = [];
      while (minePositions.length < mineCount) {
        const pos = Math.floor(Math.random() * gridSize);
        if (!minePositions.includes(pos)) {
          minePositions.push(pos);
        }
      }

      const game: MinesGame = {
        betAmount,
        mineCount,
        gridSize,
        minePositions,
        revealedTiles: [],
        isActive: true,
        currentMultiplier: 1.0,
      };

      minesGames.set(req.userId!, game);

      res.json({
        gridSize,
        mineCount,
        betAmount,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reveal tile
  app.post("/api/mines/reveal", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = minesGames.get(req.userId!);
      if (!game || !game.isActive) {
        return res.status(400).json({ message: 'No active mines game found' });
      }

      const { tileIndex } = minesRevealSchema.parse(req.body);

      if (game.revealedTiles.includes(tileIndex)) {
        return res.status(400).json({ message: 'Tile already revealed' });
      }

      const hitMine = game.minePositions.includes(tileIndex);

      if (hitMine) {
        game.isActive = false;
        minesGames.delete(req.userId!);

        await storage.createBet({
          userId: req.userId!,
          gameType: 'mines',
          betAmount: game.betAmount.toString(),
          betChoice: `${game.mineCount} mines`,
          result: `Hit mine at tile ${tileIndex}`,
          outcome: 'loss',
          payout: '0',
        });

        return res.json({
          hitMine: true,
          tileIndex,
          minePositions: game.minePositions,
          payout: 0,
        });
      }

      game.revealedTiles.push(tileIndex);
      
      const safeTiles = game.gridSize - game.mineCount;
      const revealedCount = game.revealedTiles.length;
      game.currentMultiplier = Math.pow(game.gridSize / (game.gridSize - game.mineCount), revealedCount);

      res.json({
        hitMine: false,
        tileIndex,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        potentialPayout: game.betAmount * game.currentMultiplier,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cash out mines game
  app.post("/api/mines/cashout", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = minesGames.get(req.userId!);
      if (!game || !game.isActive) {
        return res.status(400).json({ message: 'No active mines game found' });
      }

      if (game.revealedTiles.length === 0) {
        return res.status(400).json({ message: 'Must reveal at least one tile before cashing out' });
      }

      const gameSnapshot = {
        betAmount: game.betAmount,
        currentMultiplier: game.currentMultiplier,
        revealedCount: game.revealedTiles.length,
        mineCount: game.mineCount,
      };
      minesGames.delete(req.userId!);

      const payout = gameSnapshot.betAmount * gameSnapshot.currentMultiplier;

      const balance = await storage.getBalance(req.userId!);
      const newBalance = (parseFloat(balance?.amount || '0') + payout).toString();
      await storage.updateBalance(req.userId!, newBalance);

      await storage.createBet({
        userId: req.userId!,
        gameType: 'mines',
        betAmount: gameSnapshot.betAmount.toString(),
        betChoice: `${gameSnapshot.mineCount} mines, ${gameSnapshot.revealedCount} revealed`,
        result: `Cashed out at ${gameSnapshot.currentMultiplier.toFixed(2)}x`,
        outcome: 'win',
        payout: payout.toString(),
      });

      await storage.createTransaction({
        userId: req.userId!,
        type: 'win',
        amount: payout.toString(),
        description: `Won ${payout.toFixed(2)} USDT on mines (${gameSnapshot.currentMultiplier.toFixed(2)}x)`,
      });

      res.json({
        payout,
        multiplier: gameSnapshot.currentMultiplier,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get mines game status
  app.get("/api/mines/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const game = minesGames.get(req.userId!);
      
      if (!game || !game.isActive) {
        return res.json({ hasActiveGame: false });
      }

      res.json({
        hasActiveGame: true,
        revealedTiles: game.revealedTiles,
        currentMultiplier: game.currentMultiplier,
        potentialPayout: game.betAmount * game.currentMultiplier,
        betAmount: game.betAmount,
        mineCount: game.mineCount,
        gridSize: game.gridSize,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
