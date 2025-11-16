import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Coins, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GameLayout } from '@/components/GameLayout';

export default function Play() {
  const [betAmount, setBetAmount] = useState('10');
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<{ result: 'heads' | 'tails'; outcome: 'win' | 'loss'; payout: string } | null>(null);
  const { toast } = useToast();

  const { data: balance } = useQuery<{ amount: string; currency: string }>({
    queryKey: ['/api/balance'],
  });

  const betMutation = useMutation({
    mutationFn: async (data: { betAmount: string; betChoice: string; gameType: string }) => {
      return apiRequest<{ result: string; outcome: string; payout: string }>('POST', '/api/bet', data);
    },
    onSuccess: (data) => {
      setLastResult({
        result: data.result as 'heads' | 'tails',
        outcome: data.outcome as 'win' | 'loss',
        payout: data.payout
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bets/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        title: data.outcome === 'win' ? 'You Won!' : 'Better luck next time',
        description: data.outcome === 'win' 
          ? `Congratulations! You won ${parseFloat(data.payout).toFixed(2)} USDT!`
          : `You lost ${betAmount} USDT. Try again!`,
        variant: data.outcome === 'win' ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bet failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlaceBet = async () => {
    if (!selectedSide) {
      toast({
        title: "Select a side",
        description: "Please choose heads or tails before placing your bet.",
        variant: "destructive",
      });
      return;
    }

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

    setIsFlipping(true);
    setLastResult(null);

    await betMutation.mutateAsync({
      betAmount: betAmount,
      betChoice: selectedSide,
      gameType: 'coinflip'
    });

    setTimeout(() => {
      setIsFlipping(false);
    }, 1000);
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  const maxBet = Math.min(currentBalance, 1000);

  return (
    <GameLayout
      title="Coin Flip"
      description="Choose heads or tails and test your luck! 2x payout on wins."
      icon={<Coins className="h-10 w-10" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coin Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {isFlipping ? (
                        <motion.div
                          key="flipping"
                          initial={{ rotateY: 0 }}
                          animate={{ rotateY: 720 }}
                          exit={{ rotateY: 720 }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className="h-48 w-48 rounded-full bg-gradient-to-br from-crypto to-warning flex items-center justify-center shadow-2xl"
                        >
                          <Coins className="h-24 w-24 text-background" />
                        </motion.div>
                      ) : lastResult ? (
                        <motion.div
                          key={lastResult.result}
                          initial={{ scale: 0, rotateY: 0 }}
                          animate={{ scale: 1, rotateY: 360 }}
                          transition={{ duration: 0.5, type: "spring" }}
                          className={`h-48 w-48 rounded-full bg-gradient-to-br ${
                            lastResult.outcome === 'win' 
                              ? 'from-success to-success/70' 
                              : 'from-destructive to-destructive/70'
                          } flex items-center justify-center shadow-2xl`}
                        >
                          <div className="text-center">
                            <div className="text-6xl font-bold text-white mb-2">
                              {lastResult.result === 'heads' ? 'H' : 'T'}
                            </div>
                            <div className="text-sm text-white/90 uppercase tracking-wider">
                              {lastResult.result}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="h-48 w-48 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl"
                        >
                          <Coins className="h-24 w-24 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Result Display */}
                  {lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className={`text-2xl font-bold ${lastResult.outcome === 'win' ? 'text-success' : 'text-destructive'}`}>
                        {lastResult.outcome === 'win' ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-6 w-6" />
                            <span>+{parseFloat(lastResult.payout).toFixed(2)} USDT</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-6 w-6" />
                            <span>-{parseFloat(betAmount).toFixed(2)} USDT</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Odds Display */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Payout Odds</div>
                    <div className="text-3xl font-bold text-crypto">2.00x</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Betting Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle>Place Your Bet</CardTitle>
                <CardDescription>Choose your side and bet amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Side Selection */}
                <div className="space-y-2">
                  <Label>Choose Side</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={selectedSide === 'heads' ? 'default' : 'outline'}
                      className={`h-16 text-lg ${selectedSide === 'heads' ? 'bg-primary' : ''}`}
                      onClick={() => setSelectedSide('heads')}
                      data-testid="button-select-heads"
                    >
                      Heads
                    </Button>
                    <Button
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className={`h-16 text-lg ${selectedSide === 'tails' ? 'bg-primary' : ''}`}
                      onClick={() => setSelectedSide('tails')}
                      data-testid="button-select-tails"
                    >
                      Tails
                    </Button>
                  </div>
                </div>

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
                  <div className="pt-2">
                    <Slider
                      value={[parseFloat(betAmount) || 0]}
                      onValueChange={(value) => setBetAmount(value[0].toString())}
                      max={maxBet}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
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

                {/* Place Bet Button */}
                <Button
                  onClick={handlePlaceBet}
                  disabled={!selectedSide || isFlipping || betMutation.isPending || currentBalance <= 0}
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
                  data-testid="button-place-bet"
                >
                  {isFlipping ? 'Flipping...' : 'Place Bet'}
                </Button>

                {currentBalance <= 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                    Insufficient balance. Please deposit crypto to start playing.
                  </div>
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
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">House Edge</span>
                <span className="font-mono font-bold">0%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Win Chance</span>
                <span className="font-mono font-bold text-primary">50%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Payout</span>
                <span className="font-mono font-bold text-success">2.00x</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Min Bet</span>
                <span className="font-mono font-bold">1 USDT</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Max Bet</span>
                <span className="font-mono font-bold">1000 USDT</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 bg-primary/10 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Provably Fair</h3>
                <p className="text-sm text-muted-foreground">
                  All games use cryptographic algorithms to ensure fairness. Every result is verifiable and transparent.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </GameLayout>
  );
}
