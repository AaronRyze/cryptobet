import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Rocket } from "lucide-react";
import { GameLayout } from "@/components/GameLayout";

export default function Crash() {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState("10");
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);

  const { data: balance } = useQuery<{ amount: string }>({
    queryKey: ['/api/balance'],
  });

  const { data: gameStatus, refetch: refetchStatus } = useQuery<{
    hasActiveGame: boolean;
    currentMultiplier?: number;
    betAmount?: number;
    potentialPayout?: number;
    startTime?: number;
    crashed?: boolean;
    crashPoint?: number;
  }>({
    queryKey: ['/api/crash/status'],
    refetchInterval: isPlaying ? 100 : false,
  });

  useEffect(() => {
    if (gameStatus?.hasActiveGame && gameStatus.currentMultiplier !== undefined) {
      setIsPlaying(true);
      setCrashed(false);
      setCurrentMultiplier(gameStatus.currentMultiplier);
    } else if (gameStatus?.crashed && gameStatus.crashPoint !== undefined) {
      setIsPlaying(false);
      setCrashed(true);
      setCrashPoint(gameStatus.crashPoint);
      toast({
        title: "Crashed",
        description: `The game crashed at ${gameStatus.crashPoint.toFixed(2)}x`,
        variant: "destructive",
      });
    }
  }, [gameStatus, toast]);

  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/crash/start', { betAmount: parseFloat(betAmount) });
    },
    onSuccess: () => {
      setIsPlaying(true);
      setCrashed(false);
      setCrashPoint(null);
      setCurrentMultiplier(1.0);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crash/status'] });
      toast({
        title: "Game Started",
        description: `Bet placed: ${betAmount} USDT`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{
        crashed: boolean;
        multiplier?: number;
        payout?: number;
        crashPoint: number;
      }>('POST', '/api/crash/cashout');
    },
    onSuccess: (data) => {
      setIsPlaying(false);
      if (data.crashed) {
        setCrashed(true);
        setCrashPoint(data.crashPoint);
        toast({
          title: "Too Late",
          description: `The game crashed at ${data.crashPoint.toFixed(2)}x before you could cash out`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cashed Out",
          description: `Won ${(data.payout || 0).toFixed(2)} USDT at ${(data.multiplier || 1).toFixed(2)}x`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crash/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsPlaying(false);
      refetchStatus();
    },
  });

  const handleStart = () => {
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }
    startMutation.mutate();
  };

  const handleCashout = () => {
    cashoutMutation.mutate();
  };

  const currentBalance = parseFloat(balance?.amount || '0');
  const potentialPayout = gameStatus?.potentialPayout || 0;

  return (
    <GameLayout
      title="Crash"
      description="Cash out before the multiplier crashes!"
      icon={<Rocket className="h-10 w-10" />}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Game Controls</CardTitle>
            <CardDescription>
              Place your bet and cash out before the crash
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bet-amount">Bet Amount (USDT)</Label>
              <Input
                id="bet-amount"
                data-testid="input-bet-amount"
                type="number"
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isPlaying || startMutation.isPending}
                placeholder="Enter bet amount"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="font-mono font-semibold">
                {currentBalance.toFixed(2)} USDT
              </span>
            </div>

            {!isPlaying ? (
              <Button
                data-testid="button-start-game"
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="w-full"
                size="lg"
              >
                {startMutation.isPending ? "Starting..." : "Start Game"}
              </Button>
            ) : (
              <Button
                data-testid="button-cashout"
                onClick={handleCashout}
                disabled={cashoutMutation.isPending}
                className="w-full"
                size="lg"
                variant="default"
              >
                {cashoutMutation.isPending ? "Cashing Out..." : "Cash Out"}
              </Button>
            )}

            {isPlaying && (
              <div className="p-3 bg-accent/20 rounded-md space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Potential Payout:</span>
                  <span className="font-mono font-semibold text-primary">
                    {potentialPayout.toFixed(2)} USDT
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Multiplier</CardTitle>
            <CardDescription>
              {isPlaying ? "Game in progress..." : crashed ? "Game crashed!" : "Waiting to start..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64">
              <div className={`text-8xl font-bold font-mono transition-colors ${
                isPlaying ? "text-primary animate-pulse" : crashed ? "text-destructive" : "text-muted-foreground"
              }`} data-testid="text-multiplier">
                {isPlaying || crashed ? currentMultiplier.toFixed(2) : "1.00"}x
              </div>
              
              {isPlaying && (
                <div className="mt-4 flex items-center gap-2 text-green-500">
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-lg font-semibold">Rising...</span>
                </div>
              )}

              {crashed && crashPoint && (
                <div className="mt-4 flex items-center gap-2 text-destructive">
                  <TrendingDown className="w-6 h-6" />
                  <span className="text-lg font-semibold">
                    Crashed at {crashPoint.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Enter your bet amount and click "Start Game"</p>
          <p>• The multiplier will start rising from 1.00x</p>
          <p>• Click "Cash Out" before the game crashes to win</p>
          <p>• The crash point is random and unknown until it happens</p>
          <p>• If you don't cash out before the crash, you lose your bet</p>
        </CardContent>
      </Card>
    </GameLayout>
  );
}
