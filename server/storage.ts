import { 
  type User, 
  type InsertUser, 
  type Balance, 
  type InsertBalance,
  type Deposit,
  type InsertDeposit,
  type Bet,
  type InsertBet,
  type Transaction,
  type InsertTransaction,
  users,
  balances,
  deposits,
  bets,
  transactions
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { walletAddress: string }): Promise<User>;

  // Balance operations
  getBalance(userId: string): Promise<Balance | undefined>;
  createBalance(balance: InsertBalance): Promise<Balance>;
  updateBalance(userId: string, amount: string): Promise<Balance>;

  // Deposit operations
  getDeposits(userId: string): Promise<Deposit[]>;
  createDeposit(deposit: Omit<InsertDeposit, 'userId'> & { userId: string }): Promise<Deposit>;
  updateDepositStatus(depositId: string, status: string, transactionHash?: string): Promise<Deposit | undefined>;

  // Bet operations
  getBets(userId: string): Promise<Bet[]>;
  getRecentBets(userId: string, limit?: number): Promise<Bet[]>;
  createBet(bet: Omit<InsertBet, 'userId'> & { userId: string; result: string; outcome: string; payout: string }): Promise<Bet>;

  // Transaction operations
  getTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(transaction: Omit<InsertTransaction, 'userId'> & { userId: string }): Promise<Transaction>;

  // Utility operations
  clearAll(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private balances: Map<string, Balance>;
  private deposits: Map<string, Deposit>;
  private bets: Map<string, Bet>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.users = new Map();
    this.balances = new Map();
    this.deposits = new Map();
    this.bets = new Map();
    this.transactions = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser & { walletAddress: string }): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Balance operations
  async getBalance(userId: string): Promise<Balance | undefined> {
    return Array.from(this.balances.values()).find(
      (balance) => balance.userId === userId,
    );
  }

  async createBalance(insertBalance: InsertBalance): Promise<Balance> {
    const id = randomUUID();
    const balance: Balance = { 
      id,
      userId: insertBalance.userId,
      amount: insertBalance.amount || "0",
      currency: insertBalance.currency || "USDT"
    };
    this.balances.set(id, balance);
    return balance;
  }

  async updateBalance(userId: string, amount: string): Promise<Balance> {
    const existingBalance = await this.getBalance(userId);
    if (existingBalance) {
      existingBalance.amount = amount;
      this.balances.set(existingBalance.id, existingBalance);
      return existingBalance;
    }
    // Create new balance if doesn't exist
    const id = randomUUID();
    const balance: Balance = {
      id,
      userId,
      amount,
      currency: "USDT"
    };
    this.balances.set(id, balance);
    return balance;
  }

  // Deposit operations
  async getDeposits(userId: string): Promise<Deposit[]> {
    return Array.from(this.deposits.values())
      .filter((deposit) => deposit.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDeposit(insertDeposit: Omit<InsertDeposit, 'userId'> & { userId: string }): Promise<Deposit> {
    const id = randomUUID();
    const deposit: Deposit = {
      id,
      userId: insertDeposit.userId,
      amount: insertDeposit.amount,
      currency: insertDeposit.currency || 'USDT',
      walletAddress: insertDeposit.walletAddress,
      status: 'pending',
      transactionHash: null,
      createdAt: new Date(),
    };
    this.deposits.set(id, deposit);
    return deposit;
  }

  async updateDepositStatus(depositId: string, status: string, transactionHash?: string): Promise<Deposit | undefined> {
    const deposit = this.deposits.get(depositId);
    if (deposit) {
      deposit.status = status;
      if (transactionHash) {
        deposit.transactionHash = transactionHash;
      }
      this.deposits.set(depositId, deposit);
      return deposit;
    }
    return undefined;
  }

  // Bet operations
  async getBets(userId: string): Promise<Bet[]> {
    return Array.from(this.bets.values())
      .filter((bet) => bet.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getRecentBets(userId: string, limit: number = 5): Promise<Bet[]> {
    const userBets = await this.getBets(userId);
    return userBets.slice(0, limit);
  }

  async createBet(insertBet: Omit<InsertBet, 'userId'> & { userId: string; result: string; outcome: string; payout: string }): Promise<Bet> {
    const id = randomUUID();
    const bet: Bet = {
      ...insertBet,
      id,
      createdAt: new Date(),
    };
    this.bets.set(id, bet);
    return bet;
  }

  // Transaction operations
  async getTransactions(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTransaction(insertTransaction: Omit<InsertTransaction, 'userId'> & { userId: string }): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async clearAll(): Promise<void> {
    this.users.clear();
    this.balances.clear();
    this.deposits.clear();
    this.bets.clear();
    this.transactions.clear();
  }
}

export class DbStorage implements IStorage {
  private db;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser & { walletAddress: string }): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Balance operations
  async getBalance(userId: string): Promise<Balance | undefined> {
    const result = await this.db.select().from(balances).where(eq(balances.userId, userId));
    return result[0];
  }

  async createBalance(insertBalance: InsertBalance): Promise<Balance> {
    const result = await this.db.insert(balances).values(insertBalance).returning();
    return result[0];
  }

  async updateBalance(userId: string, amount: string): Promise<Balance> {
    const existingBalance = await this.getBalance(userId);
    if (existingBalance) {
      const result = await this.db
        .update(balances)
        .set({ amount })
        .where(eq(balances.userId, userId))
        .returning();
      return result[0];
    }
    // Create new balance if doesn't exist
    const result = await this.db
      .insert(balances)
      .values({
        userId,
        amount,
        currency: "USDT"
      })
      .returning();
    return result[0];
  }

  // Deposit operations
  async getDeposits(userId: string): Promise<Deposit[]> {
    return await this.db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, userId))
      .orderBy(desc(deposits.createdAt));
  }

  async createDeposit(insertDeposit: Omit<InsertDeposit, 'userId'> & { userId: string }): Promise<Deposit> {
    const result = await this.db
      .insert(deposits)
      .values({
        ...insertDeposit,
        status: 'pending',
        transactionHash: null
      })
      .returning();
    return result[0];
  }

  async updateDepositStatus(depositId: string, status: string, transactionHash?: string): Promise<Deposit | undefined> {
    const updateData: any = { status };
    if (transactionHash) {
      updateData.transactionHash = transactionHash;
    }
    const result = await this.db
      .update(deposits)
      .set(updateData)
      .where(eq(deposits.id, depositId))
      .returning();
    return result[0];
  }

  // Bet operations
  async getBets(userId: string): Promise<Bet[]> {
    return await this.db
      .select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt));
  }

  async getRecentBets(userId: string, limit: number = 5): Promise<Bet[]> {
    return await this.db
      .select()
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt))
      .limit(limit);
  }

  async createBet(insertBet: Omit<InsertBet, 'userId'> & { userId: string; result: string; outcome: string; payout: string }): Promise<Bet> {
    const result = await this.db.insert(bets).values(insertBet).returning();
    return result[0];
  }

  // Transaction operations
  async getTransactions(userId: string): Promise<Transaction[]> {
    return await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: Omit<InsertTransaction, 'userId'> & { userId: string }): Promise<Transaction> {
    const result = await this.db.insert(transactions).values(insertTransaction).returning();
    return result[0];
  }

  async clearAll(): Promise<void> {
    await this.db.delete(transactions);
    await this.db.delete(bets);
    await this.db.delete(deposits);
    await this.db.delete(balances);
    await this.db.delete(users);
  }
}

export const storage = new DbStorage();
