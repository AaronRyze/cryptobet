import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Trophy, Building2, Cloud, Star, Sparkles, ArrowUp, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GameLayout } from '@/components/GameLayout';

interface TowerStatus {
  hasActiveGame: boolean;
  currentLevel?: number;
  currentMultiplier?: number;
  potentialPayout?: number;
  betAmount?: number;
}

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', winChance: '66%', multiplier: '1.5x', color: 'bg-green-600 hover:bg-green-700' },
  { key: 'medium', label: 'Medium', winChance: '50%', multiplier: '2.0x', color: 'bg-yellow-600 hover:bg-yellow-700' },
  { key: 'hard', label: 'Hard', winChance: '33%', multiplier: '3.0x', color: 'bg-red-600 hover:bg-red-700' },
];

const MAX_LEVEL = 8;

export default function Tower() {
  const [betAmount, setBetAmount] = useState('10');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const { toast } = useToast();

  const { data: balance } = useQuery<{ amount: string; currency: string }>({
    queryKey: ['/api/balance'],
  });

  const { data: gameStatus, refetch: refetchStatus } = useQuery<TowerStatus>({
    queryKey: ['/api/tower/status'],
    refetchInterval: isPlaying ? 1000 : false,
  });

  useEffect(() => {
    if (gameStatus?.hasActiveGame) {
      setIsPlaying(true);
    }
  }, [gameStatus]);

  const startGameMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest<{ currentLevel: number; currentMultiplier: number; potentialPayout: number }>(
        'POST',
        '/api/tower/start',
        { betAmount: amount }
      );
    },
    onSuccess: () => {
      setIsPlaying(true);
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      toast({
        title: "Game Started",
        description: "Choose a difficulty to climb the skyscraper.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start game",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const playLevelMutation = useMutation({
    mutationFn: async (difficulty: string) => {
      return apiRequest<{
        outcome: string;
        currentLevel?: number;
        currentMultiplier?: number;
        potentialPayout?: number;
        maxLevel?: boolean;
        lostAmount?: number;
      }>('POST', '/api/tower/play', { difficulty });
    },
    onSuccess: (data) => {
      if (data.outcome === 'loss') {
        setIsPlaying(false);
        setShowExplosion(true);
        setTimeout(() => setShowExplosion(false), 2000);
        toast({
          title: "Game Over",
          description: `You fell and lost ${data.lostAmount?.toFixed(2)} USDT. Better luck next time`,
          variant: "destructive",
        });
      } else if (data.maxLevel) {
        toast({
          title: "Top Floor Reached",
          description: `Great job! Cash out your ${data.potentialPayout?.toFixed(2)} USDT`,
        });
      } else {
        toast({
          title: "Floor Cleared",
          description: `Current payout: ${data.potentialPayout?.toFixed(2)} USDT`,
        });
      }
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bets/recent'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ payout: number; level: number; multiplier: number }>(
        'POST',
        '/api/tower/cashout',
        {}
      );
    },
    onSuccess: (data) => {
      setIsPlaying(false);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bets/recent'] });
      refetchStatus();
      toast({
        title: "Cashed Out",
        description: `You won ${data.payout.toFixed(2)} USDT (Floor ${data.level})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cash out failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleStartGame = () => {
    const amount = parseFloat(betAmount);
    const currentBalance = parseFloat(balance?.amount || '0');

    if (amount <= 0 || isNaN(amount)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid bet amount.",
        variant: "destructive",
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough funds. Please deposit more crypto.",
        variant: "destructive",
      });
      return;
    }

    startGameMutation.mutate(betAmount);
  };

  const handlePlayLevel = (difficulty: string) => {
    playLevelMutation.mutate(difficulty);
  };

  const handleCashOut = () => {
    cashOutMutation.mutate();
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  const currentLevel = gameStatus?.currentLevel || 0;
  const currentMultiplier = gameStatus?.currentMultiplier || 1;
  const potentialPayout = gameStatus?.potentialPayout || 0;

  return (
    <GameLayout
      title="Skyscraper"
      description="Climb the tower of fortune, one level at a time!"
      icon={<Building2 className="h-10 w-10" />}
    >
      <div className="space-y-8 relative">
      {/* Explosion Effect */}
      <AnimatePresence>
        {showExplosion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          >
            {/* Background Flash */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0.8, 0],
                backgroundColor: ['#000000', '#ff0000', '#ff6600', '#000000']
              }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            />

            {/* Explosion Particles - Large Bursts */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`burst-${i}`}
                initial={{ 
                  scale: 0,
                  x: '50vw',
                  y: '50vh',
                  rotate: 0
                }}
                animate={{
                  scale: [0, 2, 3],
                  x: `${50 + Math.cos((i * 30) * Math.PI / 180) * 60}vw`,
                  y: `${50 + Math.sin((i * 30) * Math.PI / 180) * 60}vh`,
                  rotate: [0, 360],
                  opacity: [1, 0.8, 0]
                }}
                transition={{ 
                  duration: 1.2,
                  ease: "easeOut",
                  delay: i * 0.05
                }}
                className="absolute w-32 h-32 -ml-16 -mt-16"
              >
                <div className={`w-full h-full rounded-full ${
                  i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-orange-500' : 'bg-yellow-400'
                } blur-xl opacity-80`} />
              </motion.div>
            ))}

            {/* Shockwave Rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`ring-${i}`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 8],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-32 h-32 border-8 border-orange-500 rounded-full" />
              </motion.div>
            ))}

            {/* Flying Debris/Sparks */}
            {[...Array(30)].map((_, i) => {
              const angle = (i * 12) * Math.PI / 180;
              const distance = 40 + Math.random() * 60;
              return (
                <motion.div
                  key={`spark-${i}`}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 1,
                    opacity: 1
                  }}
                  animate={{
                    x: `${50 + Math.cos(angle) * distance}vw`,
                    y: `${50 + Math.sin(angle) * distance}vh`,
                    scale: [1, 0.5, 0],
                    opacity: [1, 0.8, 0],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 1 + Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute"
                >
                  {i % 4 === 0 ? (
                    <Star className={`h-6 w-6 ${
                      i % 3 === 0 ? 'text-red-500' : i % 3 === 1 ? 'text-orange-500' : 'text-yellow-400'
                    }`} fill="currentColor" />
                  ) : i % 4 === 1 ? (
                    <Sparkles className={`h-6 w-6 ${
                      i % 3 === 0 ? 'text-red-500' : i % 3 === 1 ? 'text-orange-500' : 'text-yellow-400'
                    }`} />
                  ) : i % 4 === 2 ? (
                    <Zap className={`h-8 w-8 ${
                      i % 3 === 0 ? 'text-red-500' : i % 3 === 1 ? 'text-orange-500' : 'text-yellow-400'
                    }`} fill="currentColor" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full ${
                      i % 3 === 0 ? 'bg-red-500' : i % 3 === 1 ? 'bg-orange-500' : 'bg-yellow-400'
                    }`} />
                  )}
                </motion.div>
              );
            })}

            {/* Central Explosion Core */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 4, 6],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-64 h-64 rounded-full bg-gradient-radial from-white via-yellow-400 to-red-600 blur-3xl" />
            </motion.div>

            {/* Cartoon "BOOM!" Text */}
            <motion.div
              initial={{ scale: 0, rotate: -45, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 1.2],
                rotate: [0, 5, -5, 0],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.3, 0.5, 1]
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,1)]" style={{
                textShadow: '0 0 20px #ff0000, 0 0 40px #ff6600, 4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000',
                WebkitTextStroke: '3px black'
              }}>
                BOOM!
              </div>
            </motion.div>

            {/* Screen Shake Effect */}
            <motion.div
              animate={{
                x: [0, -10, 10, -10, 10, 0],
                y: [0, 10, -10, 10, -10, 0]
              }}
              transition={{
                duration: 0.4,
                repeat: 2
              }}
              className="absolute inset-0 bg-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <Cloud className="absolute top-20 left-10 h-20 w-20 text-primary animate-pulse" style={{ animationDuration: '4s' }} />
        <Cloud className="absolute top-40 right-20 h-16 w-16 text-primary animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <Star className="absolute top-60 left-1/4 h-8 w-8 text-crypto animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        <Star className="absolute top-80 right-1/3 h-6 w-6 text-crypto animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Building2 className="h-12 w-12 text-primary" />
            <Sparkles className="h-6 w-6 text-crypto absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-crypto to-primary bg-clip-text text-transparent">
              Skyscraper
            </h1>
            <p className="text-muted-foreground">Climb the skyscraper and multiply your bet! Cash out anytime or risk it all.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tower Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-background to-card shadow-2xl shadow-primary/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-crypto/5 pointer-events-none" />
              <CardContent className="p-8 relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-primary" />
                    The Tower
                  </h3>
                  <Badge variant="outline" className="border-crypto text-crypto font-bold">
                    8 Floors
                  </Badge>
                </div>
                <div className="space-y-3">
                  {/* Levels in reverse order (top to bottom) */}
                  {Array.from({ length: MAX_LEVEL }, (_, i) => MAX_LEVEL - i).map((level) => {
                    const isCurrentLevel = isPlaying && currentLevel === level - 1;
                    const isPassed = currentLevel >= level;
                    const isFuture = currentLevel < level - 1;

                    return (
                      <motion.div
                        key={level}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: level * 0.05 }}
                        className={`
                          relative flex items-center justify-between p-4 rounded-xl border-2 transition-all overflow-hidden
                          ${isCurrentLevel 
                            ? 'bg-gradient-to-r from-primary/30 to-primary/10 border-primary shadow-xl shadow-primary/20 scale-105' 
                            : isPassed 
                            ? 'bg-gradient-to-r from-success/20 to-success/5 border-success/50 shadow-lg' 
                            : 'bg-gradient-to-r from-secondary to-secondary/50 border-border hover:border-border/80'
                          }
                        `}
                      >
                        {/* Decorative Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent" />
                        </div>

                        <div className="flex items-center gap-3 relative z-10">
                          <Badge 
                            variant="secondary" 
                            className={`
                              text-lg font-bold w-14 h-14 flex items-center justify-center rounded-xl shadow-md
                              ${isCurrentLevel ? 'bg-primary text-primary-foreground border-2 border-primary-foreground/20' : ''}
                              ${isPassed ? 'bg-success text-success-foreground border-2 border-success-foreground/20' : ''}
                            `}
                          >
                            {level}
                          </Badge>
                          <div>
                            <span className={`text-lg font-semibold block ${isCurrentLevel ? 'text-primary' : ''}`}>
                              Floor {level}
                            </span>
                            {isCurrentLevel && (
                              <span className="text-xs text-primary/70 flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" /> Your Position
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isPassed && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="relative z-10"
                          >
                            <div className="bg-success/20 p-2 rounded-full">
                              <Trophy className="h-6 w-6 text-success" />
                            </div>
                          </motion.div>
                        )}

                        {isCurrentLevel && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1], x: [-2, 2, -2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-primary font-bold flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full relative z-10"
                          >
                            <Sparkles className="h-4 w-4" />
                            CURRENT
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Start Position */}
                  <div className="relative flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-crypto/50 bg-gradient-to-r from-crypto/5 to-transparent overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-crypto/10 via-transparent to-transparent opacity-50" />
                    <div className="flex items-center gap-3 relative z-10">
                      <Badge variant="outline" className="text-lg font-bold w-14 h-14 flex items-center justify-center border-crypto text-crypto rounded-xl shadow-md bg-crypto/10">
                        0
                      </Badge>
                      <div>
                        <span className="text-lg font-semibold block">Ground Floor</span>
                        <span className="text-xs text-muted-foreground">Starting Point</span>
                      </div>
                    </div>
                    {!isPlaying && (
                      <motion.span 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-sm text-crypto font-medium flex items-center gap-2 relative z-10"
                      >
                        <Star className="h-4 w-4" /> Begin your ascent
                      </motion.span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Game Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-2 border-primary/20 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-crypto/5 pointer-events-none" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  {isPlaying ? (
                    <>
                      <Sparkles className="h-5 w-5 text-primary" />
                      Choose Difficulty
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5 text-crypto" />
                      Start Game
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {isPlaying ? 'Pick your risk level for the next floor' : 'Set your bet amount and begin your ascent'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isPlaying ? (
                  <>
                    {/* Bet Amount */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bet-amount">Bet Amount (USDT)</Label>
                        <span className="text-sm text-muted-foreground">
                          Balance: <span className="font-mono text-crypto">{currentBalance.toFixed(2)}</span>
                        </span>
                      </div>
                      <Input
                        id="bet-amount"
                        type="number"
                        placeholder="Enter bet amount"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="bg-secondary border-border text-lg"
                        data-testid="input-bet-amount"
                      />
                      <div className="flex gap-2">
                        {[10, 50, 100].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setBetAmount(amount.toString())}
                            disabled={amount > currentBalance}
                            data-testid={`button-preset-${amount}`}
                          >
                            {amount}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBetAmount(currentBalance.toString())}
                          disabled={currentBalance <= 0}
                          data-testid="button-max-bet"
                        >
                          Max
                        </Button>
                      </div>
                    </div>

                    {/* Start Button */}
                    <Button
                      onClick={handleStartGame}
                      disabled={startGameMutation.isPending || currentBalance <= 0}
                      className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 via-primary to-purple-500 hover:from-purple-700 hover:via-primary/90 hover:to-purple-600 shadow-lg shadow-primary/30 relative overflow-hidden group"
                      data-testid="button-start-game"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                      <ArrowUp className="h-5 w-5 mr-2" />
                      {startGameMutation.isPending ? 'Starting...' : 'Start Ascent'}
                      <Sparkles className="h-5 w-5 ml-2" />
                    </Button>

                    {currentBalance <= 0 && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                        Insufficient balance. Please deposit crypto to start playing.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Difficulty Selection */}
                    <div className="space-y-3">
                      <Label>Select Difficulty for Floor {currentLevel + 1}</Label>
                      {DIFFICULTIES.map((diff, index) => (
                        <Button
                          key={diff.key}
                          onClick={() => handlePlayLevel(diff.key)}
                          disabled={playLevelMutation.isPending || currentLevel >= MAX_LEVEL}
                          className={`w-full h-16 text-lg ${diff.color} text-white shadow-lg relative overflow-hidden group`}
                          data-testid={`button-difficulty-${diff.key}`}
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                          <div className="flex items-center justify-between w-full relative z-10">
                            <div className="flex items-center gap-2">
                              {index === 0 && <TrendingDown className="h-5 w-5" />}
                              {index === 1 && <DollarSign className="h-5 w-5" />}
                              {index === 2 && <TrendingUp className="h-5 w-5" />}
                              <span className="font-bold">{diff.label}</span>
                            </div>
                            <div className="text-sm bg-black/20 px-3 py-1 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span>Win: {diff.winChance}</span>
                                <span className="text-crypto">Mult: {diff.multiplier}</span>
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>

                    {/* Cash Out Button */}
                    <Button
                      onClick={handleCashOut}
                      disabled={cashOutMutation.isPending || currentLevel === 0}
                      variant="outline"
                      className="w-full h-14 text-lg border-2 border-success text-success hover:bg-success hover:text-success-foreground shadow-lg shadow-success/20 relative overflow-hidden group"
                      data-testid="button-cash-out"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-success/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                      <DollarSign className="h-5 w-5 mr-2" />
                      {cashOutMutation.isPending ? 'Cashing Out...' : `Cash Out ${potentialPayout.toFixed(2)} USDT`}
                      <Trophy className="h-5 w-5 ml-2" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Stats Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {isPlaying && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent shadow-xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    Current Game
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="space-y-3">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-background/80 backdrop-blur-sm shadow-md border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Floor</span>
                      </div>
                      <span className="font-mono font-bold text-lg">{currentLevel} / {MAX_LEVEL}</span>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-background/80 backdrop-blur-sm shadow-md border border-primary/30"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Multiplier</span>
                      </div>
                      <span className="font-mono font-bold text-lg text-primary">{currentMultiplier.toFixed(2)}x</span>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      animate={{ boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0)", "0 0 0 8px rgba(34, 197, 94, 0)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-success/30 to-success/10 border-2 border-success/50 shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-success" />
                        <span className="text-sm font-medium text-success-foreground">Potential Win</span>
                      </div>
                      <span className="font-mono font-bold text-xl text-success">{potentialPayout.toFixed(2)} USDT</span>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card className="border-2 border-crypto/20 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-crypto/5 to-transparent pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="bg-crypto/20 p-2 rounded-lg">
                  <Star className="h-5 w-5 text-crypto" />
                </div>
                How to Play
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm relative">
              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="bg-primary text-primary-foreground font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                <p>Start with a bet amount</p>
              </div>
              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="bg-primary text-primary-foreground font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                <p>Choose difficulty for each floor</p>
              </div>
              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="bg-primary text-primary-foreground font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                <p>Your multiplier increases as you climb</p>
              </div>
              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-success/5 transition-colors">
                <div className="bg-success text-success-foreground font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">4</div>
                <p>Cash out anytime to secure winnings</p>
              </div>
              <div className="flex gap-3 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="bg-destructive text-destructive-foreground font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">!</div>
                <p className="text-destructive font-medium">One mistake and you fall - losing everything!</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                Difficulty Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative">
              {DIFFICULTIES.map((diff, index) => (
                <motion.div 
                  key={diff.key} 
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary to-secondary/50 shadow-md border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      index === 0 ? 'bg-green-600' : index === 1 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {index === 0 && <TrendingDown className="h-5 w-5 text-white" />}
                      {index === 1 && <DollarSign className="h-5 w-5 text-white" />}
                      {index === 2 && <TrendingUp className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <div className="font-semibold">{diff.label}</div>
                      <div className="text-xs text-muted-foreground">Win: {diff.winChance}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono font-bold text-base border border-primary/20 bg-primary/10 text-primary px-3 py-1">
                    {diff.multiplier}
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </div>
    </GameLayout>
  );
}
