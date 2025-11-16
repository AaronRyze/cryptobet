import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Disc3, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GameLayout } from '@/components/GameLayout';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const getNumberColor = (num: number) => {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
};

export default function Roulette() {
  const [betAmount, setBetAmount] = useState('10');
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ result: number; outcome: 'win' | 'loss'; payout: string } | null>(null);
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
        result: parseInt(data.result),
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
    if (!selectedBet) {
      toast({
        title: "Select a bet",
        description: "Please choose a bet type before placing your bet.",
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

    setIsSpinning(true);
    setLastResult(null);

    await betMutation.mutateAsync({
      betAmount: betAmount,
      betChoice: selectedBet,
      gameType: 'roulette'
    });

    setTimeout(() => {
      setIsSpinning(false);
    }, 2000);
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  const maxBet = Math.min(currentBalance, 1000);

  const getBetPayout = () => {
    if (!selectedBet) return '?';
    if (!isNaN(parseInt(selectedBet))) return '36x';
    return '2x';
  };

  return (
    <GameLayout
      title="Roulette"
      description="Place your bets on numbers or colors and watch the wheel spin!"
      icon={<Disc3 className="h-10 w-10" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Roulette Wheel Display */}
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
                      {isSpinning ? (
                        <motion.div
                          key="spinning"
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 1080 }}
                          exit={{ rotate: 1080 }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          className="h-48 w-48 rounded-full border-8 border-primary bg-gradient-to-br from-background to-secondary flex items-center justify-center shadow-2xl"
                        >
                          <div className="text-4xl font-bold text-primary">?</div>
                        </motion.div>
                      ) : lastResult ? (
                        <motion.div
                          key={lastResult.result}
                          initial={{ scale: 0, rotate: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ duration: 0.5, type: "spring" }}
                          className={`h-48 w-48 rounded-full border-8 ${
                            lastResult.outcome === 'win' 
                              ? 'border-success from-success to-success/70' 
                              : 'border-destructive from-destructive to-destructive/70'
                          } bg-gradient-to-br flex items-center justify-center shadow-2xl`}
                        >
                          <div className="text-center">
                            <div className={`text-6xl font-bold mb-2 ${
                              getNumberColor(lastResult.result) === 'red' ? 'text-red-500' :
                              getNumberColor(lastResult.result) === 'black' ? 'text-gray-900 dark:text-white' :
                              'text-green-500'
                            }`}>
                              {lastResult.result}
                            </div>
                            <div className="text-sm text-white/90 uppercase tracking-wider">
                              {getNumberColor(lastResult.result)}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="h-48 w-48 rounded-full border-8 border-primary bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl"
                        >
                          <div className="text-6xl font-bold text-primary-foreground">
                            00
                          </div>
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

                  {/* Payout Display */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Potential Payout</div>
                    <div className="text-3xl font-bold text-crypto">{getBetPayout()}</div>
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
                <CardDescription>Choose your bet type and amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bet Type Selection */}
                <div className="space-y-2">
                  <Label>Bet Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant={selectedBet === 'red' ? 'default' : 'outline'}
                      className={`${selectedBet === 'red' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-600/10'}`}
                      onClick={() => setSelectedBet('red')}
                      data-testid="button-bet-red"
                    >
                      Red (2x)
                    </Button>
                    <Button
                      variant={selectedBet === 'black' ? 'default' : 'outline'}
                      className={`${selectedBet === 'black' ? 'bg-gray-900 hover:bg-gray-800' : 'border-gray-900 text-gray-900 dark:text-white hover:bg-gray-900/10'}`}
                      onClick={() => setSelectedBet('black')}
                      data-testid="button-bet-black"
                    >
                      Black (2x)
                    </Button>
                    <Button
                      variant={selectedBet === 'odd' ? 'default' : 'outline'}
                      onClick={() => setSelectedBet('odd')}
                      data-testid="button-bet-odd"
                    >
                      Odd (2x)
                    </Button>
                    <Button
                      variant={selectedBet === 'even' ? 'default' : 'outline'}
                      onClick={() => setSelectedBet('even')}
                      data-testid="button-bet-even"
                    >
                      Even (2x)
                    </Button>
                  </div>

                  {/* Number Grid */}
                  <div className="mt-4">
                    <Label>Or pick a specific number (36x payout)</Label>
                    <div className="grid grid-cols-6 gap-1 mt-2">
                      {/* Green 0 */}
                      <Button
                        size="sm"
                        variant={selectedBet === '0' ? 'default' : 'outline'}
                        className={`${
                          selectedBet === '0' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'border-green-600 text-green-600 hover:bg-green-600/10'
                        }`}
                        onClick={() => setSelectedBet('0')}
                        data-testid="button-bet-number-0"
                      >
                        0
                      </Button>

                      {/* Numbers 1-36 */}
                      {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                        const color = getNumberColor(num);
                        const isRed = color === 'red';
                        return (
                          <Button
                            key={num}
                            size="sm"
                            variant={selectedBet === num.toString() ? 'default' : 'outline'}
                            className={`${
                              selectedBet === num.toString()
                                ? isRed
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-gray-900 hover:bg-gray-800'
                                : isRed
                                ? 'border-red-600 text-red-600 hover:bg-red-600/10'
                                : 'border-gray-900 text-gray-900 dark:text-white hover:bg-gray-900/10'
                            }`}
                            onClick={() => setSelectedBet(num.toString())}
                            data-testid={`button-bet-number-${num}`}
                          >
                            {num}
                          </Button>
                        );
                      })}
                    </div>
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
                  disabled={!selectedBet || isSpinning || betMutation.isPending || currentBalance <= 0}
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
                  data-testid="button-place-bet"
                >
                  {isSpinning ? 'Spinning...' : 'Spin Roulette'}
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
              <CardTitle>Payout Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                  <span className="text-sm font-medium">Red / Black</span>
                  <Badge variant="secondary" className="font-mono">2x</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                  <span className="text-sm font-medium">Odd / Even</span>
                  <Badge variant="secondary" className="font-mono">2x</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                  <span className="text-sm font-medium">Specific Number</span>
                  <Badge variant="secondary" className="font-mono text-success">36x</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <span className="text-sm text-muted-foreground">Numbers</span>
                <span className="font-mono font-bold">0-36</span>
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

        </motion.div>
      </div>
    </GameLayout>
  );
}
